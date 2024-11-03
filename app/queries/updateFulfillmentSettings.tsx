export const updateFulfillmentSettingsMutation = () =>
  `
mutation updateMerchantFulfillmentSettings($input: UpdateShopifyFulfillmentInput!){
  updateShopifyFulfillmentSettings(input: $input)
}`;
