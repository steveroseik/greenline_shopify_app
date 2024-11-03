export const updateProductsSyncMutation = (
  merchantId: number,
  synced: boolean,
) =>
  `
mutation updateShopifyProductsSync{
  updateShopifyProductsSync(input: {
    merchantId: ${merchantId},
    shopifyProductsSynced: ${synced}
  })
}
`;
