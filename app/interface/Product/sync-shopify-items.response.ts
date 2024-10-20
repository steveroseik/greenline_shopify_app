export interface SyncShopifyItemsResponse {
  syncShopifyProducts: {
    success: boolean;
    message: string;
    data: {
      itemsInInventory: [];
      itemsInOrders: [];
      itemsInReturns: [];
      failedItemUpdates: [];
      failedVariantUpdates: [];
    };
  };
}
