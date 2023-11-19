import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Document, Types } from 'mongoose';
import { Manufacturer } from '../../manufacturers/schemas/manufacturer.schema';
import { Vendor } from '../../vendors/schemas/vendor.schema';

@Schema()
class Image {
  @Prop({ type: String, default: '' })
  fileName: string;

  @Prop()
  cdnLink: string;

  @Prop({ type: Number, default: 0 })
  i: number;

  @Prop({ type: String, default: null })
  alt: string | null;
}

@Schema()
class Variant {
  @Prop()
  id: string;

  @Prop()
  available: boolean;

  @Prop({ type: Object, default: {} })
  attributes: Record<string, any>;

  @Prop()
  cost: number;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: Number, default: null })
  depth: number | null;

  @Prop()
  description: string;

  @Prop({ type: String, default: null })
  dimensionUom: string | null;

  @Prop({ type: Number, default: null })
  height: number | null;

  @Prop({ type: Number, default: null })
  width: number | null;

  @Prop()
  manufacturerItemCode: string;

  @Prop()
  manufacturerItemId: string;

  @Prop()
  packaging: string;

  @Prop()
  price: number;

  @Prop({ type: Number, default: null })
  volume: number | null;

  @Prop({ type: String, default: null })
  volumeUom: string | null;

  @Prop({ type: Number, default: null })
  weight: number | null;

  @Prop({ type: String, default: null })
  weightUom: string | null;

  @Prop()
  optionName: string;

  @Prop()
  optionsPath: string;

  @Prop()
  optionItemsPath: string;

  @Prop()
  sku: string;

  @Prop()
  active: boolean;

  @Prop([Image])
  images: Image[];

  @Prop()
  itemCode: string;
}

@Schema()
class OptionValue {
  @Prop()
  id: string;

  @Prop()
  name: string;

  @Prop()
  value: string;
}

@Schema()
class Option {
  @Prop()
  name: string;

  @Prop([OptionValue])
  values: OptionValue[];

  @Prop()
  id: string;

  @Prop({ type: String, default: null })
  dataField: string | null;
}

@Schema()
class Data {
  @Prop()
  name: string;

  @Prop({ type: String, default: 'non-inventory' })
  type: string;

  @Prop()
  shortDescription: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: Vendor.name })
  vendorId: Vendor;

  @Prop({ type: Types.ObjectId, ref: Manufacturer.name })
  manufacturerId: Manufacturer;

  @Prop({ type: String, default: 'members-only' })
  storefrontPriceVisibility: string;

  @Prop([Variant])
  variants: Variant[];

  @Prop([Option])
  options: Option[];

  @Prop()
  availability: string;

  @Prop()
  isFragile: boolean;

  @Prop()
  published: string;

  @Prop()
  isTaxable: boolean;

  @Prop([Object])
  images: Record<string, any>[];

  @Prop()
  categoryId: string;
}

@Schema()
class Info {
  @Prop()
  createdBy: string;

  @Prop()
  createdAt: Date;

  @Prop({ type: String, default: null })
  updatedBy: string | null;

  @Prop({ type: Date, default: null })
  updatedAt: Date | null;

  @Prop({ type: String, default: null })
  deletedBy: string | null;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  @Prop({ type: String, default: 'nao' })
  dataSource: string;

  @Prop()
  companyStatus: string;

  @Prop()
  transactionId: string;

  @Prop()
  skipEvent: boolean;

  @Prop()
  userRequestId: string;
}

export type ProductDocument = HydratedDocument<Product>;

@Schema()
export class Product extends Document {
  @Prop({ type: Types.ObjectId })
  _id: Types.ObjectId;

  @Prop()
  docId: string;

  @Prop({ type: Object, default: null })
  fullData: Record<string, any> | null;

  @Prop({ type: Data })
  data: Data;

  @Prop({ type: Object, default: {} })
  dataPublic: Record<string, any>;

  @Prop()
  immutable: boolean;

  @Prop()
  deploymentId: string;

  @Prop({ type: String, default: 'items' })
  docType: string;

  @Prop({ type: String, default: 'items' })
  namespace: string;

  @Prop()
  companyId: string;

  @Prop({ type: String, default: 'active' })
  status: string;

  @Prop({ type: Info })
  info: Info;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
