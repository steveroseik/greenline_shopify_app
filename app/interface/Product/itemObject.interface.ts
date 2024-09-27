export interface Item {
  id: number;
  shopifyId: null;
  merchantId: number;
  name: string;
  currency: string;
  imageUrl: string;
  description: string;
  itemVariants: ItemVariant[];
}

export interface ItemVariant {
  id: number;
  name: string;
  itemId: number;
  shopifyId?: string;
  isEnabled: boolean;
  merchantSku: string;
  imageUrl: string;
  price: string;
  selectedOptions: SelectedOption[];
}

export interface SelectedOption {
  id: number;
  variantOption: VariantOption;
  variantName: VariantName;
}

export interface VariantName {
  id: number;
  name: string;
}

export interface VariantOption {
  id: number;
  value: string;
}
