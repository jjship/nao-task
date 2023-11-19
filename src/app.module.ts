import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ProductsModule, ScheduleModule.forRoot()],
})
export class AppModule {}
