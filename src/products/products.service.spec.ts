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
  let mockBaseProductModel: Model<BaseProductDocument>;
  let mockProductDataModel: Model<ProductDataDocument>;
  let tempProductModel: Model<TempProductDocument>;
  let mockVendorModel: Model<VendorDocument>;
  let mockManufacturerModel: Model<ManufacturerDocument>;
  let mockService: ProductsService;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    tempProductModel = mongoConnection.model(
      TempProduct.name,
      TempProductSchema,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getModelToken(BaseProduct.name),
          useValue: Model,
        },
        {
          provide: getModelToken(ProductData.name),
          useValue: Model,
        },
        {
          provide: getModelToken(TempProduct.name),
          useValue: tempProductModel,
        },
        {
          provide: getModelToken(Vendor.name),
          useValue: Model,
        },
        {
          provide: getModelToken(Manufacturer.name),
          useValue: Model,
        },
      ],
      // imports: [
      //   MongooseModule.forFeature([
      //     { name: BaseProduct.name, schema: BaseProductSchema },
      //   ]),
      //   MongooseModule.forFeature([
      //     { name: ProductData.name, schema: ProductDataSchema },
      //   ]),
      // MongooseModule.forFeature([
      //   { name: TempProduct.name, schema: TempProductSchema },
      // ]),
      //   MongooseModule.forFeature([
      //     { name: Vendor.name, schema: VendorSchema },
      //   ]),
      //   MongooseModule.forFeature([
      //     { name: Manufacturer.name, schema: ManufacturerSchema },
      //   ]),
      // TerminusModule,
      // ],
    }).compile();

    mockBaseProductModel = Model<BaseProductDocument> = module.get<
      Model<BaseProductDocument>
    >(getModelToken(BaseProduct.name));

    mockProductDataModel = module.get<Model<ProductDataDocument>>(
      getModelToken(ProductData.name),
    );

    // mockTempProductModel = module.get<Model<TempProductDocument>>(
    //   getModelToken(TempProduct.name),
    // );

    mockVendorModel = module.get<Model<VendorDocument>>(
      getModelToken(Vendor.name),
    );

    mockManufacturerModel = module.get<Model<ManufacturerDocument>>(
      getModelToken(Manufacturer.name),
    );

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

  it('should parse and save csv row data', async () => {
    await expect(
      mockService.safeCreateTempProduct({ row: mockRow }),
    ).resolves.toEqual({
      status: 'ok',
      error: null,
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
