export interface LoaderResponse {
  success: Boolean;
  shop: String;
  merchant?: {
    id: number;
    name: string;
  };
  message?: String;
}
