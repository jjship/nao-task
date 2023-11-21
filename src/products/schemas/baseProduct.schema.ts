import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Document, Types } from 'mongoose';
import { nanoid } from 'nanoid';

export type BaseProductDocument = HydratedDocument<BaseProduct>;
@Schema()
export class BaseProduct extends Document {
  @Prop({ type: Types.ObjectId })
  _id: Types.ObjectId;

  @Prop({ type: String, default: nanoid() })
  internalProductId: string;

  @Prop()
  vendorProductId: string;

  @Prop()
  manufacturerId: string;

  @Prop()
  vendorId: string;
}

export const BaseProductSchema = SchemaFactory.createForClass(BaseProduct);
