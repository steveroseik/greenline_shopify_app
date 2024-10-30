import { MerchantSettings } from "./find-shop";

export interface LoaderResponse {
  success: Boolean;
  shop: String;
  merchant?: {
    id: number;
    name: string;
    settings: MerchantSettings;
  };
  message?: String;
}
