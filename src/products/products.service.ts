import * as path from 'path';
import * as fs from 'fs';
import * as Papa from 'papaparse';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductData, Variant } from './schemas/productData.schema';
import { TempProduct } from './schemas/tempProduct.schema';
import { Vendor } from './schemas/vendor.schema';
import { Manufacturer } from './schemas/manufacturer.schema';
import { Logger } from '@nestjs/common';
import { CreateTempProductDto } from './dto/tempProduct.dto';
import { BaseProduct } from './schemas/baseProduct.schema';
import { CsvRow } from './schemas/csvRow';
import {
  calculateMarkup,
  getRandomString,
  isValidNumber,
  removeNonAlphanumeric,
} from './helpers/product.helpers';
import { MARKUP_PERCENTS } from './constants';
import { ProductDataDto, VariantDto } from './dto/productData.dto';
import { nanoid } from 'nanoid';
// import { MemoryHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectModel(BaseProduct.name)
    readonly baseProductModel: Model<BaseProduct>,
    @InjectModel(ProductData.name)
    readonly productDataModel: Model<ProductData>,
    @InjectModel(TempProduct.name)
    readonly tempProductModel: Model<TempProduct>,
    @InjectModel(Vendor.name)
    readonly vendorModel: Model<Vendor>,
    @InjectModel(Manufacturer.name)
    readonly manufacturerModel: Model<Manufacturer>,
    // private memory: MemoryHealthIndicator,
  ) {}

  private readonly logger = new Logger(ProductsService.name);

  onModuleInit = async () => {

    const filePath = path.join(__dirname, '../../../data/test-file.txt');

    this.logger.log(
      `Initializing products data import from CSV at ${filePath}`,
    );

    try {
      this.logger.log('Deleting previous temp products');
      // clean up previous temp products (keeping them until now for debugging purposes)
      await this.tempProductModel.deleteMany({});
    } catch (error) {
      this.handleError(error);
    }
    this.logger.log('Processing CSV file');
    await this.processCsvFile({ filePath });
    this.logger.log('Updating products data');
    await this.updateProductsData();

    return;
  };

  private processCsvFile = async ({ filePath }: { filePath: string }) => {
    const fileStream = fs.createReadStream(filePath);

    return new Promise<void>((resolve, reject) => {
      Papa.parse(fileStream, {
        chunkSize: 50000,
        header: true,
        chunk: async (result, parser) => {
          parser.pause();

          await this.processChunk(result.data);

          parser.resume();
        },
        complete: () => {
          this.logger.log('CSV file successfully processed', {
            validRowsCount: this.csvInfo.validRowsCount,
            invalidRowsCount: this.csvInfo.invalidRowsCount,
            tempProductsCounter: this.csvInfo.tempProductsCounter,
            errors: this.csvInfo.errors,
          });
          resolve();
        },
        error: (error) => {
          this.logger.error('Error processing CSV file:', error);
          reject(error);
        },
      });
    });
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

  updateProductsData = async () => {
    const cursor = this.tempProductModel.find().cursor();

    for await (const tempProduct of cursor) {
      const {
        internalManufacturerId,
        internalVendorId,
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
          internalManufacturerId,
          internalVendorId,
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
    }
    cursor.on('error', (error) => {
      this.handleError(error);
    });

    this.logger.log('Products data updated', this.csvInfo);
  };

  private csvInfo: {
    validRowsCount: number;
    invalidRowsCount: number;
    invalidRows: { row: Partial<CsvRow>; invalidFields: string[] }[];
    tempProductsCounter: number;
    baseProductsCount: number;
    newProductsCount: number;
    newVariantsCount: number;
    errors: Error[];
  } = {
    validRowsCount: 0,
    invalidRowsCount: 0,
    invalidRows: [],
    tempProductsCounter: 0,
    baseProductsCount: 0,
    newProductsCount: 0,
    newVariantsCount: 0,
    errors: [],
  };

  safeCreateTempProduct = async ({
    row,
  }: {
    row: CsvRow | Partial<CsvRow>;
  }): Promise<
    { status: 'ok'; error: null } | { status: 'error'; error: Error }
  > => {
    try {
      const invalidFields: string[] = [];
      if (!this.isValidCsvRow(row, invalidFields)) {
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

      const tempProductData = this.prepareTempProductData({ row });

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
  };

  isValidCsvRow(row: any, invalidFields: string[]): row is CsvRow {
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
    ); // csv parsing will return strings or null so this is fine
  }

  prepareTempProductData({ row }: { row: CsvRow }): CreateTempProductDto {
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

  safeGetUniqueProductData = async ({
    tempProduct,
  }: {
    tempProduct: TempProduct;
  }): Promise<
    | {
        internalManufacturerId: null;
        internalVendorId: null;
        internalProductId: null;
        error: Error;
      }
    | {
        internalManufacturerId: string;
        internalVendorId: string;
        internalProductId: string;
        error: null;
      }
  > => {
    try {
      const internalManufacturerId = await this.getManufacturerId({
        manufacturerId: tempProduct.manufacturerId,
        manufacturerName: tempProduct.manufacturerName,
      });

      const internalVendorId = await this.getVendorId({
        manufacturerId: tempProduct.manufacturerId,
        manufacturerName: tempProduct.manufacturerName,
      });

      if (!internalManufacturerId || !internalVendorId) {
        throw new Error(
          `Error while getting vendorId or manufacturerId for manufacturer name: ${tempProduct.manufacturerName} and id: ${tempProduct.manufacturerId}`,
        );
      }

      const internalProductId = await this.getProductId({
        internalManufacturerId,
        internalVendorId,
        vendorProductId: tempProduct.productId,
      });

      if (!internalProductId) {
        throw new Error(
          `Error while getting internalProductId for product id: ${tempProduct.productId} and manufacturer id: ${tempProduct.manufacturerId}`,
        );
      }

      return {
        internalManufacturerId,
        internalVendorId,
        internalProductId,
        error: null,
      };
    } catch (error) {
      return {
        internalManufacturerId: null,
        internalVendorId: null,
        internalProductId: null,
        error,
      };
    }
  };

  getVendorId = async ({
    manufacturerId,
    manufacturerName,
  }: {
    manufacturerId: string;
    manufacturerName: string;
  }) => {
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
  };

  getManufacturerId = async ({
    manufacturerId,
    manufacturerName,
  }: {
    manufacturerId: string;
    manufacturerName: string;
  }) => {
    const manufacturer = await this.manufacturerModel
      .findOneAndUpdate(
        {
          manufacturerId: manufacturerId,
          manufacturerName: manufacturerName,
        },
        {
          $setOnInsert: {
            manufacturerId: manufacturerId,
            manufacturerName: manufacturerName,
          },
        },
        { new: true, upsert: true, projection: { _id: 1 } },
      )
      .exec();

    return manufacturer ? manufacturer._id.toString() : null;
  };

  getProductId = async ({
    internalManufacturerId,
    internalVendorId,
    vendorProductId,
  }: {
    internalManufacturerId: string;
    internalVendorId: string;
    vendorProductId: string;
  }) => {
    const baseProduct = await this.baseProductModel
      .findOneAndUpdate(
        {
          manufacturerId: internalManufacturerId,
          vendorId: internalVendorId,
          vendorProductId,
        },
        {
          $setOnInsert: {
            manufacturerId: internalManufacturerId,
            vendorId: internalVendorId,
            vendorProductId,
            internalProductId: nanoid(),
          },
        },
        { new: true, upsert: true, projection: { internalProductId: 1 } },
      )
      .exec();

    if (baseProduct) {
      this.csvInfo.baseProductsCount++;
    }

    return baseProduct ? baseProduct.internalProductId : null;
  };

  safeGetProductData = async ({
    tempProduct,
    internalManufacturerId,
    internalVendorId,
    internalProductId,
  }: {
    tempProduct: TempProduct;
    internalManufacturerId: string;
    internalVendorId: string;
    internalProductId: string;
  }): Promise<
    | { productData: ProductData; error: null }
    | { productData: null; error: Error }
  > => {
    try {
      const productData = await this.productDataModel
        .findOne({ docId: internalProductId })
        .exec();

      if (!productData) {
        const newProductData = prepareCommonProductData({
          tempProduct,
          internalManufacturerId,
          internalVendorId,
          internalProductId,
        });

        const newProduct = await this.productDataModel
          .findOneAndUpdate(
            { docId: internalProductId },
            {
              $set: newProductData,
            },
            { upsert: true, new: true },
          )
          .exec();

        this.csvInfo.newProductsCount++;

        return { productData: newProduct, error: null };
      }

      return { productData, error: null };
    } catch (error) {
      return { productData: null, error };
    }

    function prepareCommonProductData({
      tempProduct,
      internalManufacturerId,
      internalVendorId,
      internalProductId,
    }: {
      tempProduct: TempProduct;
      internalManufacturerId: string;
      internalVendorId: string;
      internalProductId: string;
    }): ProductDataDto {
      return {
        docId: internalProductId,
        data: {
          name: getProductName(tempProduct),
          manufacturerId: internalManufacturerId,
          vendorId: internalVendorId,
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
  };

  safeUpdateVariant = async ({
    tempVariant,
    productData,
    internalProductId,
  }: {
    tempVariant: TempProduct['variants'][number];
    productData: ProductData;
    internalProductId: string;
  }): Promise<
    { status: 'ok'; error: null } | { status: 'error'; error: Error }
  > => {
    try {
      const newVariant = this.prepareNewVariantData({ tempVariant });
      const variantInDb = productData.data.variants
        ? productData.data.variants.find((v) => v.sku === newVariant.sku)
        : undefined;

      const variantDataToUpdate = this.getVariantDataToUpdate({
        newVariant,
        variantInDb,
      });

      if (Object.keys(variantDataToUpdate).length) {
        await this.productDataModel
          .findOneAndUpdate(
            { docId: internalProductId },
            { $push: { 'data.variants': variantDataToUpdate } },
          )
          .exec();

        this.csvInfo.newVariantsCount++;
      }

      return { status: 'ok', error: null };
    } catch (error) {
      return { status: 'error', error };
    }
  };
  prepareNewVariantData({
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

  getVariantDataToUpdate({
      newVariant,
      variantInDb,
    }: {
      newVariant: Variant;
      variantInDb: Variant | undefined;
    }): VariantDto {
    if (!variantInDb) {
      return new VariantDto(newVariant);
    }
    type imageKey = keyof Variant['images'][number];
      const variantDataToUpdate = new VariantDto(); // Initialize an empty VariantDto
    const variantDataInDb = new VariantDto(variantInDb); // Initialize a VariantDto with data from the database
      const keysToCheck = Object.keys(newVariant) as Array<keyof Variant>;

    for (const key of keysToCheck) {
      if (key === 'id') continue;
      if (key === 'images') {
        const newImages = newVariant.images;
        const oldImages = variantInDb.images;
        if (!newImages.length) continue;

        if (!oldImages.length) {
          variantDataToUpdate[key] = newImages;
          continue;
        }

        for (const newImage of newImages) {
          if (
            oldImages.some((oldImage) => {
              Object.keys(newImage).some((imageKey: imageKey) => {
                return oldImage[imageKey] !== newImage[imageKey];
              });
            })
          ) {
            variantDataToUpdate.images = [...newImages];
            break;
          }
        }
        continue;
      }

        if (!variantInDb || newVariant[key] !== variantInDb[key]) {
          (variantDataToUpdate as any)[key] = newVariant[key];
        }
    }

      return variantDataToUpdate;
    }

  private handleError = (error: Error) => {
    this.logger.error(error);
    this.csvInfo.errors.push(error);
  };
}
