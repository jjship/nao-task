import * as path from 'path';
import * as fs from 'fs';
import * as Papa from 'papaparse';
import {
  Injectable,
  OnModuleInit,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductData, Variant } from './schemas/productData.schema';
import { TempProduct } from './schemas/tempProduct.schema';
import { Vendor } from './schemas/vendor.schema';
import { Manufacturer } from './schemas/manufacturer.schema';
import { Logger } from '@nestjs/common';
import { CreateTempProductDto } from './dto/temp-product.dto';
import { BaseProduct } from './schemas/baseProduct.schema';
import { CsvRow } from './schemas/csvRow';
import {
  calculateMarkup,
  getRandomString,
  isValidNumber,
  removeNonAlphanumeric,
} from './helpers/product.helpers';
import { MARKUP_PERCENTS } from './constants';
// import { MemoryHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class ProductsService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(BaseProduct.name)
    private readonly baseProductModel: Model<BaseProduct>,
    @InjectModel(ProductData.name)
    private readonly productDataModel: Model<ProductData>,
    @InjectModel(TempProduct.name)
    private readonly tempProductModel: Model<TempProduct>,
    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<Vendor>,
    @InjectModel(Manufacturer.name)
    private readonly manufacturerModel: Model<Manufacturer>,
    // private memory: MemoryHealthIndicator,
  ) {}

  private readonly logger = new Logger(ProductsService.name);

  async onApplicationBootstrap() {
    const filePath = path.join(__dirname, '../../data/hundred.txt');

    try {
      this.logger.log('Deleting previous temp products');
      // clean up previous temp products (keeping them until now for debugging purposes)
      await this.tempProductModel.deleteMany({});
    } catch (error) {
      this.handleError(error);
    }

    await this.processCsvFile(filePath);
  }

  async processCsvFile(filePath: string) {
    const fileStream = fs.createReadStream(filePath);

    await this.processCsvFileNew(fileStream);

    await this.updateProductsData();
  }

  private async processCsvFileNew(fileStream: fs.ReadStream) {
    return new Promise<void>((resolve, reject) => {
      Papa.parse(fileStream, {
        chunkSize: 50000,
        header: true,
        chunk: async (result, parser) => {
          parser.pause();

          this.logger.debug('Processing chunk', result.data.length);

          await this.processChunk(result.data);

          this.logger.log({
            saved: this.csvInfo.tempProductsCounter,
            invalidRows: this.csvInfo.invalidRowsCount,
            // memory: this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
          });
          parser.resume();
        },
        complete: () => {
          this.logger.log('CSV file successfully processed', this.csvInfo);
          resolve();
        },
        error: (error) => {
          console.error('Error processing CSV file:', error);
          reject(error);
        },
      });
    });
  }

  private async updateProductsData() {
    this.logger.debug('Updating products data');
    this.tempProductModel
      .find()
      .cursor()
      .on('data', async (tempProduct) => {
        this.logger.debug('Processing temp product', tempProduct.productId);
        const {
          manufacturerId,
          vendorId,
          internalProductId,
          error: getUniqueProductDataError,
        } = await this.safeGetUniqueProductData({
          tempProduct,
        });

        if (getUniqueProductDataError) {
          this.handleError(getUniqueProductDataError);
          return;
        }

        const { productData, error: getProductDataError } =
          await this.safeGetProductData({
            tempProduct,
            vendorId,
            manufacturerId,
            internalProductId,
          });

        if (getProductDataError) {
          this.handleError(getProductDataError);
          return;
        }

        for (const tempVariant of tempProduct.variants) {
          const { error: updateVariantError } = await this.safeUpdateVariant({
            tempVariant,
            productData,
            internalProductId,
          });

          if (updateVariantError) {
            this.handleError(updateVariantError);
            continue;
          }
        }
      })
      .on('error', (error) => {
        this.handleError(error);
      })
      .on('end', () => {
        this.logger.log('Finished processing csv file');
      });
  }

  private csvInfo: {
    validRowsCount: number;
    invalidRowsCount: number;
    invalidRows: { row: Partial<CsvRow>; invalidFields: string[] }[];
    tempProductsCounter: number;
    baseProductsCount: number;
    newProductsCount: number;
    newVariantsCount: number;
  } = {
    validRowsCount: 0,
    invalidRowsCount: 0,
    invalidRows: [],
    tempProductsCounter: 0,
    baseProductsCount: 0,
    newProductsCount: 0,
    newVariantsCount: 0,
  };

  private async processChunk(chunkData: any[]) {
    for (const row of chunkData) {
      const { error: tempProductError } = await this.safeCreateTempProduct({
        row: row,
      });

      if (tempProductError) {
        this.handleError(tempProductError);
        return;
      }
    }
  }

  async safeCreateTempProduct({
    row,
  }: {
    row: CsvRow | Partial<CsvRow>;
  }): Promise<
    { status: 'ok'; error: null } | { status: 'error'; error: Error }
  > {
    try {
      const invalidFields: string[] = [];
      if (!isValidCsvRow(row, invalidFields)) {
        this.csvInfo.invalidRowsCount++;
        this.csvInfo.invalidRows.push({
          row: {
            ItemID: row.ItemID,
            ManufacturerID: row.ManufacturerID,
            ProductID: row.ProductID,
            UnitPrice: row.UnitPrice,
          },
          invalidFields,
        });

        return { status: 'ok', error: null };
      }
      this.csvInfo.validRowsCount++;

      const tempProductData = prepareTempProductData({ row });

      await this.tempProductModel
        .findOneAndUpdate(
          {
            productId: tempProductData.productId,
            manufacturerId: tempProductData.variant.manufacturerId,
          },
          { $push: { variants: tempProductData.variant } },
          { upsert: true },
        )
        .exec();

      this.csvInfo.tempProductsCounter++;

      return { status: 'ok', error: null };
    } catch (error) {
      return { status: 'error', error };
    }

    function isValidCsvRow(row: any, invalidFields: string[]): row is CsvRow {
      const requiredFields = ['ItemID', 'ManufacturerID', 'ProductID'];
      requiredFields.forEach((field) => {
        if (!row[field]) {
          invalidFields.push(field);
        }
      });

      if (!isValidNumber(row.UnitPrice)) {
        invalidFields.push('UnitPrice');
      }

      return requiredFields.every(
        (field) => Boolean(row[field]) && isValidNumber(row.UnitPrice),
      ); // fast-csv will return strings or null so this is fine
    }

    function prepareTempProductData({
      row,
    }: {
      row: CsvRow;
    }): CreateTempProductDto {
      const packaging = row.PKG ? row.PKG.toUpperCase() : null;
      return {
        productId: row.ProductID,
        manufacturerId: row.ManufacturerID,
        manufacturerName: row.ManufacturerName ?? '',
        variant: {
          sku: `${row.ItemID}${row.ProductID}${packaging ?? null}`,
          itemId: row.ItemID,
          manufacturerId: row.ManufacturerID,
          manufacturerName: row.ManufacturerName ?? null,
          productName: row.ProductName ?? null,
          pkg: packaging ?? null,
          itemDescription: row.ItemDescription
            ? removeNonAlphanumeric(row.ItemDescription)
            : null,
          unitPrice: row.UnitPrice ? parseFloat(row.UnitPrice) : null,
          manufacturerItemCode: row.ManufacturerItemCode ?? null,
          ndciItemCode: row.NDCItemCode,
          itemImageUrl: row.ItemImageURL ?? null,
          imageFileName: row.ImageFileName ?? null,
          availability: row.Availability ?? null,
        },
      };
    }
  }

  private async safeGetUniqueProductData({
    tempProduct,
  }: {
    tempProduct: TempProduct;
  }): Promise<
    | {
        manufacturerId: null;
        vendorId: null;
        internalProductId: null;
        error: Error;
      }
    | {
        manufacturerId: string;
        vendorId: string;
        internalProductId: string;
        error: null;
      }
  > {
    try {
      const manufacturerId = await this.getManufacturerId({
        manufacturerId: tempProduct.manufacturerId,
        manufacturerName: tempProduct.manufacturerName,
      });

      const vendorId = await this.getVendorId({
        manufacturerId: tempProduct.manufacturerId,
        manufacturerName: tempProduct.manufacturerName,
      });

      if (!manufacturerId || !vendorId) {
        throw new Error(
          `Error while getting vendorId or manufacturerId for manufacturer name: ${tempProduct.manufacturerName} and id: ${tempProduct.manufacturerId}`,
        );
      }

      const internalProductId = await this.getProductId({
        manufacturerId,
        vendorId,
        vendorProductId: tempProduct.productId,
      });

      if (!internalProductId) {
        throw new Error(
          `Error while getting internalProductId for product id: ${tempProduct.productId} and manufacturer id: ${tempProduct.manufacturerId}`,
        );
      }

      return {
        manufacturerId,
        vendorId,
        internalProductId,
        error: null,
      };
    } catch (error) {
      return {
        manufacturerId: null,
        vendorId: null,
        internalProductId: null,
        error,
      };
    }
  }

  private async getVendorId({
    manufacturerId,
    manufacturerName,
  }: {
    manufacturerId: string;
    manufacturerName: string;
  }) {
    const vendor = await this.vendorModel
      .findOneAndUpdate(
        {
          vendorId: manufacturerId,
          vendorName: manufacturerName,
        },
        {
          $setOnInsert: {
            vendorId: manufacturerId,
            vendorName: manufacturerName,
          },
        },

        { new: true, upsert: true, projection: { _id: 1 } },
      )
      .exec();

    return vendor ? vendor._id.toString() : null;
  }

  private async getManufacturerId({
    manufacturerId,
    manufacturerName,
  }: {
    manufacturerId: string;
    manufacturerName: string;
  }) {
    const manufacturer = await this.manufacturerModel
      .findOneAndUpdate(
        {
          manufacturerId: manufacturerId,
          manufacturerName: manufacturerName,
        },
        {
          $setOnInsert: {
            vendorId: manufacturerId,
            vendorName: manufacturerName,
          },
        },
        { new: true, upsert: true, projection: { _id: 1 } },
      )
      .exec();

    return manufacturer ? manufacturer._id.toString() : null;
  }

  private async getProductId({
    manufacturerId,
    vendorId,
    vendorProductId,
  }: {
    manufacturerId: string;
    vendorId: string;
    vendorProductId: string;
  }) {
    const baseProduct = await this.baseProductModel
      .findOneAndUpdate(
        {
          manufacturerId,
          vendorId,
          vendorProductId,
        },
        {
          $setOnInsert: {
            manufacturerId,
            vendorId,
            vendorProductId,
          },
        },
        { new: true, upsert: true, projection: { internalProductId: 1 } },
      )
      .exec();

    if (baseProduct) {
      this.csvInfo.baseProductsCount++;
    }

    return baseProduct ? baseProduct.internalProductId : null;
  }

  private async safeGetProductData({
    tempProduct,
    vendorId,
    manufacturerId,
    internalProductId,
  }: {
    tempProduct: TempProduct;
    vendorId: string;
    manufacturerId: string;
    internalProductId: string;
  }): Promise<
    | { productData: ProductData; error: null }
    | { productData: null; error: Error }
  > {
    try {
      const productData = await this.getProductData({
        internalProductId,
      });

      if (!productData) {
        const newProductData = prepareCommonProductData({
          tempProduct,
          vendorId,
          manufacturerId,
          internalProductId,
        });

        const newProduct = await this.productDataModel.findOneAndUpdate(
          { docId: internalProductId },
          {
            $setOnInsert: {
              ...newProductData,
            },
          },
          { new: true, upsert: true },
        );

        this.csvInfo.newProductsCount++;

        return { productData: newProduct, error: null };
      }

      return { productData, error: null };
    } catch (error) {
      return { productData: null, error };
    }

    function prepareCommonProductData({
      tempProduct,
      vendorId,
      manufacturerId,
      internalProductId,
    }: {
      tempProduct: TempProduct;
      vendorId: string;
      manufacturerId: string;
      internalProductId: string;
    }): Partial<ProductData> {
      console.log('TEMP************');
      console.dir({ variants: tempProduct.variants }, { depth: null });
      return {
        docId: internalProductId,
        data: {
          name: getProductName(tempProduct),
          vendorId,
          manufacturerId,
          variants: [],
          options: [],
          images: [],
        },
        info: {
          createdAt: new Date(),
        },
      };

      function getProductName(tempProduct: TempProduct) {
        const variantWithName = tempProduct.variants
          ? tempProduct.variants.find(
              (v) => v.productName && v.productName.length,
            )
          : undefined;

        if (variantWithName) {
          return removeNonAlphanumeric(variantWithName.productName);
        }

        return null;
      }
    }
  }

  private async getProductData({
    internalProductId,
  }: {
    internalProductId: string;
  }) {
    const productData = await this.productDataModel
      .findOne({ docId: internalProductId })
      .exec();
    return productData;
  }

  private async safeUpdateVariant({
    tempVariant,
    productData,
    internalProductId,
  }: {
    tempVariant: TempProduct['variants'][number];
    productData: ProductData;
    internalProductId: string;
  }): Promise<
    { status: 'ok'; error: null } | { status: 'error'; error: Error }
  > {
    try {
      const newVariant = prepareNewVariantData({ tempVariant });

      const variantInDb = productData.data.variants
        ? productData.data.variants.find((v) => v.sku === newVariant.sku)
        : undefined;

      const variantDataToUpdate = getVariantDataToUpdate({
        newVariant,
        variantInDb,
      });

      if (Object.keys(variantDataToUpdate).length) {
        await this.productDataModel
          .findOneAndUpdate(
            { docId: internalProductId },
            {
              $set: {
                'data.variants.$[variant]': variantDataToUpdate,
              },
            },
            {
              arrayFilters: [{ 'variant.sku': newVariant.sku }],
            },
          )
          .exec();

        this.csvInfo.newVariantsCount++;
      }

      return { status: 'ok', error: null };
    } catch (error) {
      return { status: 'error', error };
    }

    function prepareNewVariantData({
      tempVariant,
    }: {
      tempVariant: TempProduct['variants'][number];
    }): Variant {
      return {
        id: getRandomString({ length: 12 }),
        cost: tempVariant.unitPrice,
        price: calculateMarkup({
          cost: tempVariant.unitPrice,
          markup: MARKUP_PERCENTS,
        }),
        sku: tempVariant.sku,
        manufacturerItemId: tempVariant.itemId,
        packaging: tempVariant.pkg,
        optionName: prepareOptionName({ tempVariant }),
        manufacturerItemCode: tempVariant.manufacturerItemCode,
        description: tempVariant.itemDescription,
        available: tempVariant.availability ? true : false,
        images: getVariantImageData({ tempVariant }),
        optionsPath: '', // TODO
        optionItemsPath: '', // TODO
      };

      function prepareOptionName({
        tempVariant,
      }: {
        tempVariant: TempProduct['variants'][number];
      }) {
        return `${tempVariant.pkg}, ${tempVariant.itemDescription}`;
      }

      function getVariantImageData({
        tempVariant,
      }: {
        tempVariant: TempProduct['variants'][number];
      }) {
        return tempVariant.itemImageUrl
          ? [
              {
                cdnLink: tempVariant.itemImageUrl,
                fileName: tempVariant.imageFileName ?? '',
              },
            ]
          : [];
      }
    }

    function getVariantDataToUpdate({
      newVariant,
      variantInDb,
    }: {
      newVariant: Variant;
      variantInDb: Variant | undefined;
    }): Partial<Variant> {
      if (!variantInDb) {
        return newVariant;
      }
      type VariantKey = keyof Variant;
      const newVariantKeys = Object.keys(newVariant) as VariantKey[];
      const variantDataToUpdate: Record<string, any> = {};

      newVariantKeys.forEach((key: VariantKey) => {
        if (
          newVariant[key] !== undefined &&
          newVariant[key] !== variantInDb[key]
        ) {
          variantDataToUpdate[key] = newVariant[key] as Variant[VariantKey];
        }
      });

      return variantDataToUpdate;
    }
  }

  private handleError(error: Error) {
    this.logger.error(error);
  }
}
