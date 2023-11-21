export type CsvRow = {
  ItemID: string;
  ManufacturerID: string;
  ManufacturerName?: string | null;
  ProductID: string;
  ProductName?: string;
  PKG?: string;
  ItemDescription?: string;
  UnitPrice?: string;
  ManufacturerItemCode?: string;
  NDCItemCode?: string;
  ItemImageURL?: string | null;
  ImageFileName?: string | null;
  Availability?: string | null;
};
