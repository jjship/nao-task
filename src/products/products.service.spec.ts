import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { getModelToken } from '@nestjs/mongoose';
import { ProductData, ProductDataDocument } from './schemas/productData.schema';
import { TempProduct, TempProductDocument } from './schemas/tempProduct.schema';
import { Model } from 'mongoose';
import { BaseProduct, BaseProductDocument } from './schemas/baseProduct.schema';
import { Vendor, VendorDocument } from './schemas/vendor.schema';
import {
  Manufacturer,
  ManufacturerDocument,
} from './schemas/manufacturer.schema';
import { CsvRow } from './schemas/csvRow';

describe('ProductsService', () => {
  let mockBaseProduct: Model<BaseProductDocument>;
  let mockProductData: Model<ProductDataDocument>;
  let mockTempProduct: Model<TempProductDocument>;
  let mockVendor: Model<VendorDocument>;
  let mockManufacturer: Model<ManufacturerDocument>;
  let mockService: ProductsService;

  beforeAll(async () => {
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
          useValue: Model,
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
    }).compile();

    mockBaseProduct = Model<BaseProductDocument> = module.get<
      Model<BaseProductDocument>
    >(getModelToken(BaseProduct.name));
    mockProductData = module.get<Model<ProductDataDocument>>(
      getModelToken(ProductData.name),
    );
    mockTempProduct = module.get<Model<TempProductDocument>>(
      getModelToken(TempProduct.name),
    );
    mockVendor = module.get<Model<VendorDocument>>(getModelToken(Vendor.name));
    mockManufacturer = module.get<Model<ManufacturerDocument>>(
      getModelToken(Manufacturer.name),
    );
    mockService = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(mockService).toBeDefined();
  });

  // expect(
  //   (await service).safeCreateTempProduct({ row: mockRow }),
  // ).resolves.toEqual({
  //   status: 'ok',
  //   error: null,
  // });
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
