export interface ProductsPage {
  data: Data;
}

export interface Data {
  products: Products;
}

export interface Products {
  edges: Edge[];
  pageInfo: PageInfo;
}

export interface Edge {
  node: EdgeNode;
}

export interface EdgeNode {
  id: string;
  title: string;
  handle: string;
  description: string;
  priceRangeV2: PriceRangeV2;
  images: Images;
  variants: Variants;
}

export interface Images {
  nodes: ImageElement[];
}

export interface ImageElement {
  url: string;
}

export interface PriceRangeV2 {
  minVariantPrice: VariantPrice;
  maxVariantPrice: VariantPrice;
}

export interface VariantPrice {
  amount: string;
  currencyCode: string;
}

export interface Variants {
  nodes: VariantsNode[];
}

export interface VariantsNode {
  id: string;
  itemId?: number;
  itemName?: string;
  sku: string;
  title: string;
  price: string;
  synced?: boolean;
  invalid?: boolean;
  selectedOptions: SelectedOption[];
  displayName: string;
  availableForSale: boolean;
  compareAtPrice: null;
  image: ImageElement | null;
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
}
