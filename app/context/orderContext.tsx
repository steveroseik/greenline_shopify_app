import React, { createContext, useReducer, ReactNode } from "react";
import { GeneratedOrdersPageProps } from "~/interface/Order/generatedOrdersPage";
import { OrderDTO } from "~/interface/Order/order.dto";
import { OrdersNode } from "~/interface/Order/orderPageInterface";

interface OrderContextData {
  page: GeneratedOrdersPageProps;
  selectedOrders: Set<string>; // Store selected order IDs
}

interface OrderContextProps {
  state: OrderContextData;
  dispatch: React.Dispatch<any>;
}

const initialState: OrderContextData = {
  page: undefined,
  selectedOrders: new Set(),
};

const OrderContext = createContext<OrderContextProps | undefined>(undefined);

const orderReducer = (
  state: OrderContextData,
  action: any,
): OrderContextData => {
  switch (action.type) {
    case "SET_ORDERS":
      return { ...state, page: action.payload };
    case "SELECT_ORDER":
      const newSelectedOrders = new Set(state.selectedOrders);
      if (action.payload.selected) {
        newSelectedOrders.add(action.payload.id);
      } else {
        newSelectedOrders.delete(action.payload.id);
      }
      return { ...state, selectedOrders: newSelectedOrders };
    case "SELECT_ALL_ORDERS":
      const allOrderIds = new Set(
        state.page.orders
          .filter((e) => e.synced === false)
          .map((order) => order.id),
      );
      return { ...state, selectedOrders: allOrderIds };
    case "DESELECT_ALL_ORDERS":
      return { ...state, selectedOrders: new Set() };
    default:
      return state;
  }
};

const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(orderReducer, initialState);

  return (
    <OrderContext.Provider value={{ state, dispatch }}>
      {children}
    </OrderContext.Provider>
  );
};

const useOrderContext = () => {
  const context = React.useContext(OrderContext);
  if (context === undefined) {
    throw new Error("useOrderContext must be used within an OrderProvider");
  }
  return context;
};

export { OrderProvider, useOrderContext };
