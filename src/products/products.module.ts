import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { ProductData, ProductDataSchema } from './schemas/productData.schema';
import { TempProduct, TempProductSchema } from './schemas/tempProduct.schema';
import { BaseProduct, BaseProductSchema } from './schemas/baseProduct.schema';
import {
  Manufacturer,
  ManufacturerSchema,
} from './schemas/manufacturer.schema';
import { Vendor, VendorSchema } from './schemas/vendor.schema';
// import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BaseProduct.name, schema: BaseProductSchema },
    ]),
    MongooseModule.forFeature([
      { name: ProductData.name, schema: ProductDataSchema },
    ]),
    MongooseModule.forFeature([
      { name: TempProduct.name, schema: TempProductSchema },
    ]),
    MongooseModule.forFeature([{ name: Vendor.name, schema: VendorSchema }]),
    MongooseModule.forFeature([
      { name: Manufacturer.name, schema: ManufacturerSchema },
    ]),
    // TerminusModule,
  ],
  providers: [ProductsService],
})
export class ProductsModule {}
