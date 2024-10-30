export const updateFulfillmentSettingsQuery = () =>
  `
mutation updateMerchantFulfillmentSettings($input: UpdateShopifyFulfillmentInput!){
  updateShopifyFulfillmentSettings(input: $input)
}`;
