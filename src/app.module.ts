import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ProductsModule,
    ScheduleModule.forRoot(),
    MongooseModule.forRoot('mongodb://localhost/nest'),
  ],
})
export class AppModule {}
