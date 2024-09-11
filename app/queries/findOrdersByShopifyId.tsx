export const findOrdersByShopifyId =
  () => `query findShopifyOrders($ids: [String!]!){
  findShopifyOrders(ids: $ids){
    id
    otherId
  }
}`;
