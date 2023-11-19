import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { VendorsModule } from './vendors/vendors.module';
import { ManufacturersModule } from './manufacturers/manufacturers.module';

@Module({
  imports: [
    ProductsModule,
    ScheduleModule.forRoot(),
    MongooseModule.forRoot('mongodb://localhost/nest'),
    VendorsModule,
    ManufacturersModule,
  ],
})
export class AppModule {}
