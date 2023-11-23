import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Document, Types } from 'mongoose';

export type TempProductDocument = HydratedDocument<TempProduct>;

@Schema({ _id: false })
class TempVariant {
  @Prop()
  sku: string;

  @Prop()
  itemId: string;

  @Prop()
  productName: string;

  @Prop()
  pkg: string;

  @Prop()
  itemDescription: string;

  @Prop()
  unitPrice: number;

  @Prop()
  manufacturerItemCode: string;

  @Prop()
  ndciItemCode: string;

  @Prop()
  itemImageUrl?: string;

  @Prop()
  imageFileName?: string;

  @Prop()
  availability?: string;
}

@Schema()
export class TempProduct extends Document {
  @Prop({ type: Types.ObjectId })
  _id: Types.ObjectId;

  @Prop()
  productId: string;

  @Prop()
  manufacturerId: string;

  @Prop()
  manufacturerName: string;

  @Prop({ type: [TempVariant], default: [] })
  variants: TempVariant[];
}

export const TempProductSchema = SchemaFactory.createForClass(TempProduct);
