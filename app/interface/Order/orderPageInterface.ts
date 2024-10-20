export interface OrdersPage {
  orders: Orders;
}

export interface Orders {
  nodes: OrdersNode[];
  pageInfo: PageInfo;
}

export interface OrdersNode {
  id: string;
  name: string;
  currencyCode: string;
  createdAt: Date;
  returnStatus: string;
  cancelledAt: null;
  paymentGatewayNames: string[];
  paymentTerms: PaymentTerms | null;
  fulfillable: boolean;
  fulfillments: Fulfillment[];
  subtotalPriceSet: Set;
  totalTaxSet: Set;
  totalShippingPriceSet: Set;
  totalOutstandingSet: Set;
  totalPriceSet: Set;
  returns: Returns;
  transactions: Transaction[];
  customer: Customer;
  shippingAddress: ShippingAddress;
  fullyPaid: boolean;
  lineItems: LineItems;
  currentCartDiscountAmountSet: CurrentCartDiscountAmountSet;
}

export interface CurrentCartDiscountAmountSet {
  presentmentMoney: Money;
  shopMoney: Money;
}

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface Customer {
  firstName: null | string;
  lastName: string;
  verifiedEmail: boolean;
  email: string;
  phone: null | string;
}

export interface Fulfillment {
  id: string;
  status: string;
  order: Order;
}

export interface Order {
  id: string;
}

export interface LineItems {
  nodes: LineItemElement[];
}

export interface LineItemElement {
  id: string;
  sku: string;
  name: string;
  title: string;
  quantity: number;
  variant: Variant;
  discountedUnitPriceSet: Set;
  discountedUnitPriceAfterAllDiscountsSet: Set;
  taxLines: TaxLine[];
  originalTotalSet: Set;
  discountedTotalSet?: Set;
}

export interface Variant {
  id: string;
}

export interface Set {
  shopMoney: Money;
}

export interface TaxLine {
  priceSet: Set;
}

export interface PaymentTerms {
  paymentTermsType: string;
  paymentTermsName: string;
}

export interface Returns {
  nodes: ReturnsNode[];
}

export interface ReturnsNode {
  id: string;
  name: string;
  status: string;
  returnLineItems: ReturnLineItems;
  exchangeLineItems: ExchangeLineItems;
}

export interface ExchangeLineItems {
  nodes: ExchangeLineItemsNode[];
}

export interface ExchangeLineItemsNode {
  id: string;
  lineItem: LineItemElement;
}

export interface ReturnLineItems {
  nodes: ReturnLineItemsNode[];
}

export interface ReturnLineItemsNode {
  id: string;
  returnReason: string;
  refundedQuantity: number;
  refundableQuantity: number;
  customerNote: null;
  quantity: number;
}

export interface ShippingAddress {
  address1: string | null;
  address2: null | string;
  name: string;
  phone: null | string;
  company: null | string;
  city: string;
  country: string;
  province: string;
  provinceCode: string;
}

export interface Transaction {
  kind: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  endCursor: string;
  startCursor: string;
}
