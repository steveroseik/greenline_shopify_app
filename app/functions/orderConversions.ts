import { graphqlClient } from "~/routes/app";
import { OrderDTO } from "../interface/Order/order.dto";
import {
  OrdersPage,
  OrdersNode,
  ReturnsNode,
  ExchangeLineItems,
  Set,
  LineItemElement,
} from "../interface/Order/orderPageInterface";
import { findOrdersByShopifyId } from "~/queries/findOrdersByShopifyId";
import { OrderSimilarity } from "~/interface/Order/orderSimilarity.interface";

export async function analyzeAndGenerateOrders(
  ordersPage: OrdersPage,
): Promise<OrderDTO[]> {
  const generatedOrders: OrderDTO[] = [];

  for (const order of ordersPage.orders.nodes) {
    if (order.returnStatus === "NO_RETURN") {
      const normalOrder = generateNormalOrderDTO(order);

      generatedOrders.push(normalOrder);
    } else if (order.returnStatus === "IN_PROGRESS") {
      const hasExchange =
        order.returns.nodes.filter((r) => r.exchangeLineItems.nodes.length > 0)
          .length > 0;

      if (hasExchange) {
        for (const returnNode of order.returns.nodes) {
          if (returnNode.exchangeLineItems.nodes.length > 0) {
            const exchangeOrder = generateExchangeOrderDTO(order, returnNode);
            const returnOrder = generateReturnOrderDTO(order);
            exchangeOrder.childOrder = returnOrder;

            generatedOrders.push(exchangeOrder);
          }
        }
      } else {
        const returnOrder = generateReturnOrderDTO(order);
        generatedOrders.push(returnOrder);
      }
    }
  }

  const orderIds: string[] = [];
  generatedOrders.forEach((order) => {
    orderIds.push(order.id);
    if (order.childOrder) {
      orderIds.push(order.childOrder.id);
    }
  });

  const response = await graphqlClient.request<{
    findShopifyOrders: OrderSimilarity[];
  }>(findOrdersByShopifyId(), {
    ids: orderIds,
  });

  const ordersSynced = response.findShopifyOrders;

  console.log("SYNCED", ordersSynced);

  if (ordersSynced.length > 0) {
    ordersSynced.forEach((order) => {
      const foundOrder = generatedOrders.find((o) => o.id === order.otherId);
      if (foundOrder) {
        foundOrder.synced = true;
      }
    });
  }

  return generatedOrders;
}

export function generateNormalOrderDTO(order: OrdersNode): OrderDTO {
  const totalPrice = calculateTotalPrice(order);
  const orderItems = order.lineItems.nodes.map((lineItem) => ({
    id: lineItem.id,
    count: lineItem.quantity,
    total: lineItem.discountedTotalSet?.shopMoney.amount || "0.00",
    variantId: lineItem.variant.id,
  }));

  return {
    id: order.id,
    synced: false,
    valid:
      order.shippingAddress?.address1 !== null ||
      order.shippingAddress?.address2 !== null,
    name: order.name,
    customerDetails: order.customer,
    shippingDetails: order.shippingAddress,
    paymentGatewayNames: order.paymentGatewayNames,
    fullyPaid: order.fullyPaid,
    createdAt: order.createdAt,
    totalPrice: totalPrice,
    currencyCode: order.currencyCode,
    orderItems: orderItems,
    orderType: "normal",
  };
}

export function generateReturnOrderDTO(order: OrdersNode): OrderDTO {
  const totalPrice = calculateReturnTotalPrice(order);

  const returnOrder = order.returns.nodes.filter((e) => e.status === "OPEN")[0];

  const exchangeLineItemsIds = returnOrder.exchangeLineItems.nodes.map(
    (e) => e.lineItem.id,
  );

  let orderItems: LineItemElement[];

  if (exchangeLineItemsIds.length > 0) {
    orderItems = order.lineItems.nodes.filter(
      (lineItem) => !exchangeLineItemsIds.includes(lineItem.id),
    );
  } else {
    orderItems = order.lineItems.nodes;
  }

  return {
    id: returnOrder.id,
    synced: false,
    valid:
      order.shippingAddress?.address1 !== null ||
      order.shippingAddress?.address2 !== null,
    name: returnOrder.name,
    customerDetails: order.customer,
    shippingDetails: order.shippingAddress,
    paymentGatewayNames: order.paymentGatewayNames,
    fullyPaid: order.fullyPaid,
    createdAt: order.createdAt,
    totalPrice: totalPrice,
    orderItems: orderItems.map((lineItem) => ({
      id: lineItem.id,
      count: lineItem.quantity,
      total: lineItem.originalTotalSet.shopMoney.amount,
      variantId: lineItem.variant.id,
    })),
    currencyCode: order.currencyCode,
    orderType: "return",
    previousOrderId: order.id,
  };
}

export function generateExchangeOrderDTO(
  order: OrdersNode,
  returnNode: ReturnsNode,
): OrderDTO {
  const totalPrice = calculateExchangeTotalPrice(returnNode.exchangeLineItems);

  const returnOrder = order.returns.nodes.filter((e) => e.status === "OPEN");

  const exchangeOrder = returnOrder[0];

  const orderItems = exchangeOrder.exchangeLineItems.nodes.map(
    (exchangeLineItem) => ({
      id: exchangeLineItem.lineItem.id,
      count: exchangeLineItem.lineItem.quantity,
      total: exchangeLineItem.lineItem.originalTotalSet.shopMoney.amount,
      variantId: exchangeLineItem.lineItem.variant.id,
    }),
  );

  return {
    id: exchangeOrder.id,
    synced: false,
    valid:
      order.shippingAddress?.address1 !== null ||
      order.shippingAddress?.address2 !== null,
    name: exchangeOrder.name,
    fullyPaid: order.fullyPaid,
    customerDetails: order.customer,
    shippingDetails: order.shippingAddress,
    paymentGatewayNames: order.paymentGatewayNames,
    createdAt: order.createdAt,
    totalPrice: totalPrice,
    currencyCode: order.currencyCode,
    orderItems: orderItems,
    orderType: "exchange",
    previousOrderId: order.id,
  };
}

export function calculateTotalPrice(order: OrdersNode): string {
  const total = parseFloat(order.totalPriceSet.shopMoney.amount);
  const shipping = parseFloat(order.totalShippingPriceSet.shopMoney.amount);
  return `${(total - shipping).toFixed(2)}`;
}

export function calculateReturnTotalPrice(order: OrdersNode): string {
  const total = parseFloat(order.totalPriceSet.shopMoney.amount);
  const shipping = parseFloat(order.totalShippingPriceSet.shopMoney.amount);
  return `-${(total - shipping).toFixed(2)}`;
}

export function calculateExchangeTotalPrice(
  exchangeLineItems: ExchangeLineItems,
): string {
  const total = exchangeLineItems.nodes.reduce((acc, item) => {
    return acc + parseFloat(item.lineItem.originalTotalSet.shopMoney.amount);
  }, 0);
  return total.toFixed(2);
}
