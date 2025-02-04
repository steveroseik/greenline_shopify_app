import {
  Customer,
  OrdersNode,
  OrdersPage,
  ShippingAddress,
} from "./orderPageInterface";

export interface OrderDTO {
  id: string;
  synced: boolean;
  originalId?: number;
  valid: boolean;
  name: string;
  customerDetails: Customer;
  shippingDetails: ShippingAddress;
  paymentGatewayNames: string[];
  fullyPaid?: boolean;
  createdAt: Date;
  totalPrice: string;
  currencyCode: string;
  orderItems?: OrderItemDto[];
  childOrder?: OrderDTO;
  previousOrderId?: string;
  orderType: "delivery" | "return" | "exchange";
}

export interface OrderItemDto {
  id: string;
  count: number;
  total: string;
  variantId: string;
}
