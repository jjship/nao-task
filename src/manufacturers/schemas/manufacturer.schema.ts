import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ManufacturerDocument = HydratedDocument<Manufacturer>;

@Schema()
export class Manufacturer {
  @Prop()
  id: string;

  @Prop()
  ManufacturerId: string;

  @Prop()
  ManufacturerName: string;
}

export const ManufacturerSchema = SchemaFactory.createForClass(Manufacturer);
