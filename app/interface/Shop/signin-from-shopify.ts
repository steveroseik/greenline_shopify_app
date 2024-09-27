export interface SignInFromShopifyResponse {
  signInFromShopify: {
    success: Boolean;
    message: String | null;
    merchantDetails: Record<string, any> | null;
  };
}
