import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Document } from 'mongoose';
import { nanoid } from 'nanoid';

export type ManufacturerDocument = HydratedDocument<Manufacturer>;

@Schema()
export class Manufacturer extends Document {
  @Prop({ type: Types.ObjectId })
  _id: Types.ObjectId;

  // @Prop({ type: String, default: nanoid() })
  @Prop()
  docId: string;

  @Prop()
  manufacturerId: string;

  @Prop()
  manufacturerName: string;
}

export const ManufacturerSchema = SchemaFactory.createForClass(Manufacturer);
