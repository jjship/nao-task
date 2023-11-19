import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VendorDocument = HydratedDocument<Vendor>;

@Schema()
export class Vendor {
  @Prop()
  id: string;

  @Prop()
  vendorId: string;

  @Prop()
  vendorName: string;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);
