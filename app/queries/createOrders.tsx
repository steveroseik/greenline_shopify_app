export const createOrdersMutation =
  () => `mutation createShopifyOrders($input: CreateShopifyOrderListInput!){
  createShopifyOrders(input: $input)
}`;
