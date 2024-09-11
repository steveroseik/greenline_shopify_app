import React, { useState } from "react";
import { AppState, ShopSession, ShopSessionContext } from "./shop-session";

interface Props {
  children: React.ReactNode;
}

/**
 * The main context provider
 */
export const ShopContextProvider: React.FunctionComponent<Props> = ({
  children,
}) => {
  /**
   * Initialize state using the default state
   */
  const [shopSession, setShopSession] = useState<ShopSession>({
    linked: false,
  });

  /**
   * Declare the update state method that will handle the state values
   */
  const updateState = (newState: Partial<ShopSession>) => {
    setShopSession((prevState) => ({
      ...prevState,
      ...newState,
    }));
  };

  /**
   * Provide the context value with the current state and update function
   */
  return (
    <ShopSessionContext.Provider value={{ shopSession, updateState }}>
      {children}
    </ShopSessionContext.Provider>
  );
};
