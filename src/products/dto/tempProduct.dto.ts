export class CreateTempProductDto {
  productId: string;
  manufacturerId: string;
  manufacturerName: string;
  variant: {
    sku: string;
    itemId: string;
    manufacturerId: string;
    manufacturerName: string | null;
    productName: string | null;
    pkg: string | null;
    itemDescription: string | null;
    unitPrice: number | null;
    manufacturerItemCode: string | null;
    ndciItemCode?: string | null;
    itemImageUrl: string | null;
    imageFileName: string | null;
    availability: string | null;
  };
}
