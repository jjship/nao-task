import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Document, Types } from 'mongoose';
import { nanoid } from 'nanoid';

export type VendorDocument = HydratedDocument<Vendor>;

@Schema()
export class Vendor extends Document {
  @Prop({ type: Types.ObjectId })
  _id: Types.ObjectId;

  // @Prop({ type: String, default: nanoid() })
  @Prop()
  docId: string;

  @Prop()
  vendorId: string;

  @Prop()
  vendorName: string;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);
