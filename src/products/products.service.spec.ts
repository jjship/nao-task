import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ProductsService } from './products.service';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import {
  ProductData,
  ProductDataDocument,
  ProductDataSchema,
} from './schemas/productData.schema';
import {
  TempProduct,
  TempProductDocument,
  TempProductSchema,
} from './schemas/tempProduct.schema';
import { Connection, Model, connect } from 'mongoose';
import {
  BaseProduct,
  BaseProductDocument,
  BaseProductSchema,
} from './schemas/baseProduct.schema';
import { Vendor, VendorDocument, VendorSchema } from './schemas/vendor.schema';
import {
  Manufacturer,
  ManufacturerDocument,
  ManufacturerSchema,
} from './schemas/manufacturer.schema';
import { CsvRow } from './schemas/csvRow';

describe('ProductsService', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let tempProductModel: Model<TempProductDocument>;
  let baseProductModel: Model<BaseProductDocument>;
  let productDataModel: Model<ProductDataDocument>;
  let vendorModel: Model<VendorDocument>;
  let manufacturerModel: Model<ManufacturerDocument>;
  let mockService: ProductsService;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    tempProductModel = mongoConnection.model(
      TempProduct.name,
      TempProductSchema,
    );
    vendorModel = mongoConnection.model(Vendor.name, VendorSchema);
    manufacturerModel = mongoConnection.model(
      Manufacturer.name,
      ManufacturerSchema,
    );
    baseProductModel = mongoConnection.model(
      BaseProduct.name,
      BaseProductSchema,
    );
    productDataModel = mongoConnection.model(
      ProductData.name,
      ProductDataSchema,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getModelToken(TempProduct.name),
          useValue: tempProductModel,
        },
        {
          provide: getModelToken(Vendor.name),
          useValue: vendorModel,
        },
        {
          provide: getModelToken(Manufacturer.name),
          useValue: manufacturerModel,
        },
        {
          provide: getModelToken(BaseProduct.name),
          useValue: baseProductModel,
        },
        {
          provide: getModelToken(ProductData.name),
          useValue: productDataModel,
        },
      ],
    }).compile();

    // mockBaseProductModel = Model<BaseProductDocument> = module.get<
    //   Model<BaseProductDocument>
    // >(getModelToken(BaseProduct.name));

    // mockProductDataModel = module.get<Model<ProductDataDocument>>(
    //   getModelToken(ProductData.name),
    // );

    // // mockTempProductModel = module.get<Model<TempProductDocument>>(
    // //   getModelToken(TempProduct.name),
    // // );

    // mockVendorModel = module.get<Model<VendorDocument>>(
    //   getModelToken(Vendor.name),
    // );

    // mockManufacturerModel = module.get<Model<ManufacturerDocument>>(
    //   getModelToken(Manufacturer.name),
    // );

    mockService = module.get<ProductsService>(ProductsService);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    const collections = mongoConnection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  it('should be defined', () => {
    expect(mockService).toBeDefined();
  });

  describe('isValidCsvRow', () => {
    it('should return true if csv row has correct data', () => {
      expect(mockService.isValidCsvRow(mockRow, [])).toBe(true);
    });
    it('should return false if csv row has missing ManufacturerID', () => {
      const incompleteRow = {
        ...mockRow,
        ManufacturerID: undefined,
      };
      expect(mockService.isValidCsvRow(incompleteRow, [])).toBe(false);
    });
    it('should return false if csv row has missing ItemID', () => {
      const incompleteRow = {
        ...mockRow,
        ItemID: undefined,
      };
      expect(mockService.isValidCsvRow(incompleteRow, [])).toBe(false);
    });
    it('should return false if csv row has missing ProductID', () => {
      const incompleteRow = {
        ...mockRow,
        ProductID: undefined,
      };
      expect(mockService.isValidCsvRow(incompleteRow, [])).toBe(false);
    });
    it('should return false if csv row has missing UnitPrice that is not a number', () => {
      const incompleteRow = {
        ...mockRow,
        UnitPrice: 'not a number',
      };
      expect(mockService.isValidCsvRow(incompleteRow, [])).toBe(false);
    });
  });

  describe('safeCreateTempProduct', () => {
    describe('isValidCsvRow', () => {
      it('should return true if csv row has correct data', () => {
        expect(mockService.isValidCsvRow(mockRow, [])).toBe(true);
      });
      it('should return false if csv row has missing ManufacturerID', () => {
        const incompleteRow = {
          ...mockRow,
          ManufacturerID: undefined,
        };
        expect(mockService.isValidCsvRow(incompleteRow, [])).toBe(false);
      });
      it('should return false if csv row has missing ItemID', () => {
        const incompleteRow = {
          ...mockRow,
          ItemID: undefined,
        };
        expect(mockService.isValidCsvRow(incompleteRow, [])).toBe(false);
      });
      it('should return false if csv row has missing ProductID', () => {
        const incompleteRow = {
          ...mockRow,
          ProductID: undefined,
        };
        expect(mockService.isValidCsvRow(incompleteRow, [])).toBe(false);
      });
      it('should return false if csv row has missing UnitPrice that is not a number', () => {
        const incompleteRow = {
          ...mockRow,
          UnitPrice: 'not a number',
        };
        expect(mockService.isValidCsvRow(incompleteRow, [])).toBe(false);
      });
    });

    it('should skip a row if it has incorrect data', async () => {
      const incompleteRow = {
        ...mockRow,
        ManufacturerID: undefined,
      };
      const prepareTempProductDataSpy = jest.spyOn(
        mockService,
        'prepareTempProductData',
      );
      const result = await mockService.safeCreateTempProduct({
        row: incompleteRow,
      });

      expect(result).toStrictEqual({
        status: 'ok',
        error: null,
      });
      expect(prepareTempProductDataSpy).not.toHaveBeenCalled();
    });
    it('should parse and save csv row data', async () => {
      const result = await mockService.safeCreateTempProduct({ row: mockRow });
      const savedTempProduct = await tempProductModel.findOne();

      expect(result).toStrictEqual({
        status: 'ok',
        error: null,
      });
      expect(savedTempProduct?.manufacturerId).toEqual(mockRow.ManufacturerID);
      expect(savedTempProduct?.productId).toEqual(mockRow.ProductID);
      expect(savedTempProduct?.variants[0].sku).toEqual(
        `${mockRow.ItemID}${mockRow.ProductID}${mockRow.PKG?.toUpperCase()}`,
      );
    });
  });

  describe('updateProductsData', () => {
    describe('safeGetUniqueProductData', () => {
      describe('getProductId', () => {
        it('should create new baseProduct if productID differs', async () => {
          const newRow = { ...mockRow, ProductID: 'prod456' };
          await mockService.safeCreateTempProduct({ row: mockRow });
          await mockService.safeCreateTempProduct({ row: newRow });
          const tempProducts = (await tempProductModel.find()) as TempProduct[];

          const internalManufacturerId = (await mockService.getManufacturerId({
            manufacturerId: tempProducts[0].manufacturerId,
            manufacturerName: tempProducts[0].manufacturerName,
          })) as string;
          const internalVendorId = (await mockService.getVendorId({
            manufacturerId: tempProducts[0].manufacturerId,
            manufacturerName: tempProducts[0].manufacturerName,
          })) as string;

          const internalProductId1 = await mockService.getProductId({
            internalManufacturerId,
            internalVendorId,
            vendorProductId: tempProducts[0].productId,
          });
          const internalProductId2 = await mockService.getProductId({
            internalManufacturerId,
            internalVendorId,
            vendorProductId: tempProducts[1].productId,
          });

          expect(tempProducts[0].productId).not.toEqual(
            tempProducts[1].productId,
          );
          expect(internalProductId1).not.toEqual(internalProductId2);
        });
      });

      it('should create manufacturer, vendor and baseProduct if not found', async () => {
        await mockService.safeCreateTempProduct({ row: mockRow });
        const tempProduct = await tempProductModel.findOne();

        const result = await mockService.safeGetUniqueProductData({
          tempProduct: tempProduct!,
        });
        expect(result.error).toBeNull();
        expect(result.internalManufacturerId).toBeTruthy();
        expect(result.internalVendorId).toBeTruthy();
        expect(result.internalProductId).toBeTruthy();
      });

      it('should create new baseProduct if productID differs', async () => {
        const newRow = { ...mockRow, ProductID: 'prod456' };
        await mockService.safeCreateTempProduct({ row: mockRow });
        await mockService.safeCreateTempProduct({ row: newRow });
        const tempProducts = (await tempProductModel.find()) as TempProduct[];

        const result1 = await mockService.safeGetUniqueProductData({
          tempProduct: tempProducts[0],
        });
        const result2 = await mockService.safeGetUniqueProductData({
          tempProduct: tempProducts[1],
        });

        expect(result1.error).toBeNull();
        expect(result2.error).toBeNull();
        expect(result1.internalManufacturerId).toBeTruthy();
        expect(result2.internalManufacturerId).toBeTruthy();
        expect(result1.internalVendorId).toBeTruthy();
        expect(result2.internalVendorId).toBeTruthy();
        expect(result1.internalProductId).toBeTruthy();
        expect(result2.internalProductId).toBeTruthy();
        expect(result1.internalProductId).not.toEqual(
          result2.internalProductId,
        );
      });
    });

    describe('safeGetProductData', () => {
      it('should create productData if not found', async () => {
        await mockService.safeCreateTempProduct({ row: mockRow });
        const tempProduct = (await tempProductModel.findOne()) as TempProduct;
        const findOneProductDataSpy = jest.spyOn(
          mockService.productDataModel,
          'findOne',
        );

        const { internalManufacturerId, internalVendorId, internalProductId } =
          (await mockService.safeGetUniqueProductData({
            tempProduct: tempProduct!,
          })) as {
            internalManufacturerId: string;
            internalVendorId: string;
            internalProductId: string;
          };

        const result = await mockService.safeGetProductData({
          tempProduct,
          internalManufacturerId,
          internalVendorId,
          internalProductId,
        });

        expect(result.error).toBeNull();
        expect(findOneProductDataSpy).toHaveBeenCalledWith({
          docId: internalProductId,
        });
        expect(result.productData?.docId).toEqual(internalProductId);
        expect(result.productData?.data?.manufacturerId).toEqual(
          internalManufacturerId,
        );
        expect(result.productData?.data?.vendorId).toEqual(internalVendorId);
      });
    });

    describe('safeUpdateVariant', () => {
      it('should add variant to productData if not found', async () => {
        await mockService.safeCreateTempProduct({ row: mockRow });

        const tempProduct = (await tempProductModel.findOne()) as TempProduct;

        const { internalManufacturerId, internalVendorId, internalProductId } =
          (await mockService.safeGetUniqueProductData({
            tempProduct: tempProduct!,
          })) as {
            internalManufacturerId: string;
            internalVendorId: string;
            internalProductId: string;
          };

        const { productData } = await mockService.safeGetProductData({
          tempProduct,
          internalManufacturerId,
          internalVendorId,
          internalProductId,
        });

        const result = await mockService.safeUpdateVariant({
          tempVariant: tempProduct.variants[0],
          productData: productData!,
          internalProductId,
        });

        const productDataAfterUpdate =
          await mockService.productDataModel.findOne();

        const returnedVariant = productDataAfterUpdate?.data.variants[0];
        const expectedVariant = {
          sku: 'item123prod789BX',
          manufacturerItemCode: 'ACME-123',
          manufacturerItemId: 'item123',
          cost: 19.99,
          description: 'A highquality widget for various purposes',
          packaging: 'BX',
        };

        expect(result.error).toBeNull();
        expect(returnedVariant?.sku).toEqual(expectedVariant.sku);
        expect(returnedVariant?.manufacturerItemCode).toEqual(
          expectedVariant.manufacturerItemCode,
        );
        expect(returnedVariant?.manufacturerItemId).toEqual(
          expectedVariant.manufacturerItemId,
        );
        expect(returnedVariant?.cost).toEqual(expectedVariant.cost);
        expect(returnedVariant?.description).toEqual(
          expectedVariant.description,
        );
        expect(returnedVariant?.packaging).toEqual(expectedVariant.packaging);
      });
    });

    it('should add variant to productData', async () => {
      await mockService.safeCreateTempProduct({ row: mockRow });

      (await tempProductModel.findOne()) as TempProduct;

      await mockService.updateProductsData();

      const productDataAfterUpdate =
        await mockService.productDataModel.findOne();

      const returnedVariant = productDataAfterUpdate?.data.variants[0];

      const expectedVariant = {
        sku: 'item123prod789BX',
        manufacturerItemCode: 'ACME-123',
        manufacturerItemId: 'item123',
        cost: 19.99,
        description: 'A highquality widget for various purposes',
        packaging: 'BX',
      };

      expect(returnedVariant?.sku).toEqual(expectedVariant.sku);
      expect(returnedVariant?.manufacturerItemCode).toEqual(
        expectedVariant.manufacturerItemCode,
      );
      expect(returnedVariant?.manufacturerItemId).toEqual(
        expectedVariant.manufacturerItemId,
      );
      expect(returnedVariant?.cost).toEqual(expectedVariant.cost);
      expect(returnedVariant?.description).toEqual(expectedVariant.description);
      expect(returnedVariant?.packaging).toEqual(expectedVariant.packaging);
    });

    it('should add new variant to productData if variants are present, but sku differs', async () => {
      const nextRow = { ...mockRow, ItemID: 'item456' };
      await mockService.safeCreateTempProduct({ row: mockRow });
      await mockService.safeCreateTempProduct({ row: nextRow });

      // (await tempProductModel.findOne()) as TempProduct;

      await mockService.updateProductsData();

      const productDataAfterUpdate =
        await mockService.productDataModel.findOne();

      const returnedVariant = productDataAfterUpdate?.data.variants[0];
      const nextReturnedVariant = productDataAfterUpdate?.data.variants[1];

      expect(returnedVariant?.sku).toEqual('item123prod789BX');
      expect(nextReturnedVariant?.sku).toEqual('item456prod789BX');
    });

    describe('safeUpdateVariant', () => {
      it('should not add new variant to productData if variants are present, and no data differs', async () => {
        await mockService.safeCreateTempProduct({ row: mockRow });

        await mockService.updateProductsData();

        const productDataInDb = await mockService.productDataModel.findOne();

        const variantInDb = productDataInDb?.data.variants[0];

        const tempProduct = (await tempProductModel.findOne()) as TempProduct;

        const newVariant = mockService.prepareNewVariantData({
          tempVariant: tempProduct.variants[0],
        });

        const variantDataToUpdate = mockService.getVariantDataToUpdate({
          newVariant,
          variantInDb,
        });

        expect(Object.keys(variantDataToUpdate).length).toEqual(0);
      });
    });
  });

  const mockRow: CsvRow = {
    ItemID: 'item123',
    ManufacturerID: 'manu456',
    ManufacturerName: 'Acme Corp',
    ProductID: 'prod789',
    ProductName: 'Super Widget',
    PKG: 'bx',
    ItemDescription: 'A high-quality widget for various purposes.',
    UnitPrice: '19.99',
    ManufacturerItemCode: 'ACME-123',
    NDCItemCode: 'NDC-456',
    ItemImageURL: 'http://example.com/images/item123.jpg',
    ImageFileName: 'item123.jpg',
    Availability: 'In Stock',
  };
});
