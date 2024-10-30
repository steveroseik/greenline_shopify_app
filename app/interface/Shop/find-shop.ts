export interface FindShopResponse {
  findShop: {
    id: number;
    name: string;
    settings: MerchantSettings;
  } | null;
}

export interface MerchantSettings {
  shopifyProductsSynced: boolean;
  shopifyFulfillmentType: "automatic" | "afterAssignment" | null;
}
