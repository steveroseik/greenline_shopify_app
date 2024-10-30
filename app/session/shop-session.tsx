import React, { useContext } from "react";
import { MerchantSettings } from "~/interface/Shop/find-shop";

export interface ShopSession {
  shop?: string;
  merchantInfo?: {
    id: number;
    name: string;
    settings: MerchantSettings;
  };
  linked?: boolean;
  fetched?: boolean;
}

/**
 * Application state interface
 */
export interface AppState {
  shopSession?: ShopSession;
  updateState: (newState: Partial<ShopSession>) => void;
  resetSession: () => void;
}

/**
 * Default application state
 */
const defaultState: AppState = {
  shopSession: {
    linked: false,
  },
  updateState: () => {}, // This is just a placeholder, will be overridden in the provider.
  resetSession: () => {}, // This is just a placeholder, will be overridden in the provider.
};

/**
 * Creating the Application state context for the provider
 */
export const ShopSessionContext = React.createContext<AppState>(defaultState);

/**
 * Custom hook to use the ShopSessionContext
 */
export const useShopSession = () => useContext(ShopSessionContext);
