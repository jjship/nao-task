import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export { VariantDto, ProductDataDto };

class ImageDto {
  fileName?: string;
  cdnLink: string;
  i?: number;
  alt?: string;
}

class OptionValueDto {
  id: string;
  name: string;
  value: string;
}

class OptionDto {
  name: string;

  @Type(() => OptionValueDto)
  values: OptionValueDto[];

  id: string;
  dataField?: string;
}

class VariantDto {
  id: string;
  available?: boolean;
  attributes?: Record<string, any>;
  cost: number;
  currency?: string;
  depth?: number;
  description: string;
  dimensionUom?: string;
  height?: number;
  width?: number;
  manufacturerItemCode: string;
  manufacturerItemId: string;
  packaging: string;
  price: number;
  volume?: number;
  volumeUom?: string;
  weight?: number;
  weightUom?: string;
  optionName: string;
  optionsPath: string;
  optionItemsPath: string;
  sku: string;
  active?: boolean;

  @Type(() => ImageDto)
  images: ImageDto[];

  itemCode?: string;

  constructor(data: Partial<VariantDto> = {}) {
    Object.assign(this, data);
  }
}

class DataDto {
  name: string | null;
  shortDescription?: string;
  description?: string;
  vendorId: string;
  manufacturerId: string;
  storefrontPriceVisibility?: string;

  @Type(() => VariantDto)
  variants: VariantDto[];

  @Type(() => OptionDto)
  options: OptionDto[];

  availability?: string;
  isFragile?: boolean;
  published?: string;
  isTaxable?: boolean;

  images: Record<string, any>[];
  categoryId?: string;
}

class InfoDto {
  createdBy?: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  deletedBy?: string;
  deletedAt?: Date;
  dataSource?: string;
  companyStatus?: string;
  transactionId?: string;
  skipEvent?: boolean;
  userRequestId?: string;
}

class ProductDataDto {
  _id?: Types.ObjectId;
  docId: string;
  fullData?: Record<string, any> | null;

  @Type(() => DataDto)
  data: DataDto;

  dataPublic?: Record<string, any>;
  immutable?: boolean;
  deploymentId?: string | null;
  docType?: string;
  namespace?: string;
  companyId?: string | null;
  status?: string | null;

  @Type(() => InfoDto)
  info: InfoDto;
}
