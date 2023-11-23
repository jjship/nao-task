import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Document, Types } from 'mongoose';
import { domainToUnicode } from 'url';
import { Manufacturer } from './manufacturer.schema';
import { Vendor } from './vendor.schema';
export { Variant };

@Schema({ _id: false })
class Image {
  @Prop()
  fileName?: string;

  @Prop()
  cdnLink: string;

  @Prop()
  i?: number;

  @Prop()
  alt?: string;
}

@Schema({ _id: false })
class Variant {
  @Prop()
  id: string;

  @Prop()
  available?: boolean;

  @Prop({ type: Object })
  attributes?: Record<string, any>;

  @Prop()
  cost: number;

  @Prop({ type: String, default: 'USD' })
  currency?: string;

  @Prop()
  depth?: number;

  @Prop()
  description: string;

  @Prop()
  dimensionUom?: string;

  @Prop()
  height?: number;

  @Prop()
  width?: number;

  @Prop()
  manufacturerItemCode: string;

  @Prop()
  manufacturerItemId: string;

  @Prop()
  packaging: string;

  @Prop()
  price: number;

  @Prop()
  volume?: number;

  @Prop()
  volumeUom?: string;

  @Prop()
  weight?: number;

  @Prop()
  weightUom?: string;

  @Prop()
  optionName: string;

  @Prop()
  optionsPath: string;

  @Prop()
  optionItemsPath: string;

  @Prop()
  sku: string;

  @Prop()
  active?: boolean;

  @Prop([Image])
  images: Image[];

  @Prop()
  itemCode?: string;
}

@Schema({ _id: false })
class OptionValue {
  @Prop()
  id: string;

  @Prop()
  name: string;

  @Prop()
  value: string;
}

@Schema({ _id: false })
class Option {
  @Prop()
  name: string;

  @Prop([OptionValue])
  values: OptionValue[];

  @Prop()
  id: string;

  @Prop()
  dataField?: string;
}

@Schema({ _id: false })
class Data {
  @Prop({ type: String })
  name: string | null;

  @Prop()
  shortDescription?: string;

  @Prop()
  description?: string;

  @Prop({ type: String, ref: Vendor.name })
  vendorId: Vendor['docId'];

  @Prop({ type: String, ref: Manufacturer.name })
  manufacturerId: Manufacturer['docId'];

  @Prop({ type: String, default: 'members-only' })
  storefrontPriceVisibility?: string;

  @Prop({ type: [Variant], default: [] })
  variants: Variant[];

  @Prop([Option])
  options: Option[];

  @Prop()
  availability?: string;

  @Prop({ type: Boolean, default: false })
  isFragile?: boolean;

  @Prop()
  published?: string;

  @Prop({ type: Boolean, default: true })
  isTaxable?: boolean;

  @Prop([Object])
  images: Record<string, any>[];

  @Prop()
  categoryId?: string;
}

@Schema({ _id: false })
class Info {
  @Prop()
  createdBy?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedBy?: string;

  @Prop()
  updatedAt?: Date;

  @Prop()
  deletedBy?: string;

  @Prop()
  deletedAt?: Date;

  @Prop()
  dataSource?: string;

  @Prop()
  companyStatus?: string;

  @Prop()
  transactionId?: string;

  @Prop()
  skipEvent?: boolean;

  @Prop()
  userRequestId?: string;
}

export type ProductDataDocument = HydratedDocument<ProductData>;

@Schema()
export class ProductData extends Document {
  @Prop({ type: Types.ObjectId })
  _id: Types.ObjectId;

  @Prop()
  docId: string;

  @Prop({ type: Object, default: null })
  fullData: Record<string, any> | null;

  @Prop({ type: Data })
  data: Data;

  @Prop({ type: Object, default: {} })
  dataPublic?: Record<string, any>;

  @Prop({ type: Boolean, default: false })
  immutable?: boolean;

  @Prop({ type: String, default: null })
  deploymentId?: string | null;

  @Prop({ type: String, default: 'item' })
  docType?: string;

  @Prop({ type: String, default: 'items' })
  namespace?: string;

  @Prop({ type: String, default: null })
  companyId?: string | null;

  @Prop({ type: String, default: 'null' })
  status?: string | null;

  @Prop({ type: Info })
  info: Info;
}

export const ProductDataSchema = SchemaFactory.createForClass(ProductData);
