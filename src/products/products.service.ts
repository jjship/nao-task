import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ProductsService {
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  importProducts() {
    console.log('Importing products...');
  }
}
