import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProductsService } from './products.service';

@Injectable()
export class ProductsSchedulerService {
  constructor(private productsService: ProductsService) {}

  // @Cron(CronExpression.EVERY_DAY_AT_10AM)
  // handleCron() {
  //   this.productsService.processCSVFile();
  // }
}
