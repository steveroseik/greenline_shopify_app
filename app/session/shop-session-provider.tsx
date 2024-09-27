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
    fetched: false,
  });

  /**
   * Declare the update state method that will handle the state values
   */
  const updateState = (newState: Partial<ShopSession>) => {
    setShopSession((prevState) => {
      const updatedState = { ...prevState };

      for (const key in newState) {
        if (newState[key]) {
          updatedState[key] = newState[key];
        }
      }

      return updatedState;
    });
  };

  /**
   * Function to reset the shop session
   */
  const resetSession = () => {
    setShopSession({
      linked: false, // or any default values you want to set
      fetched: false,
    });
  };

  /**
   * Provide the context value with the current state and update function
   */
  return (
    <ShopSessionContext.Provider
      value={{ shopSession, updateState, resetSession }}
    >
      {children}
    </ShopSessionContext.Provider>
  );
};
