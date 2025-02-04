import {
  useLoaderData,
  useFetcher,
  useActionData,
  useNavigate,
} from "@remix-run/react";
import {
  Page,
  Layout,
  InlineStack,
  Pagination,
  Spinner,
  Card,
  Button,
  Checkbox,
  Text,
  Badge,
  Banner,
} from "@shopify/polaris";
import { useState, useEffect, useCallback } from "react";
import { useOrderContext } from "~/context/orderContext";
import { ActionFunction, LoaderFunction, json } from "@remix-run/node";
import { authenticate, apiVersion } from "~/shopify.server";
import { getOrdersQuery } from "~/queries/getOrders";
import {
  Orders,
  OrdersNode,
  OrdersPage,
  PageInfo,
} from "~/interface/Order/orderPageInterface";
import { order_type } from "@prisma/client";
import { OrderDTO } from "~/interface/Order/order.dto";
import { GeneratedOrdersPageProps } from "~/interface/Order/generatedOrdersPage";
import { analyzeAndGenerateOrders } from "~/functions/orderConversions";
import { graphqlClient } from "./app";
import { createOrdersMutation } from "~/queries/createOrders";
import { i } from "node_modules/vite/dist/node/types.d-aGj9QkWt";
import { ShopSession, useShopSession } from "~/session/shop-session";
import { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { gql } from "graphql-request";
import { FindShopResponse } from "~/interface/Shop/find-shop";
import { ShareIcon } from "@shopify/polaris-icons";

// export const loader: LoaderFunction = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const { shop, accessToken } = session;

//   try {
//     const response = await fetch(
//       `https://${shop}/admin/api/${apiVersion}/graphql.json`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "X-Shopify-Access-Token": accessToken!,
//         },
//         body: JSON.stringify({
//           query: getOrdersQuery(),
//         }),
//       },
//     );

//     if (!response.ok) {
//       throw new Error(`Error fetching orders: ${response.statusText}`);
//     }

//     const data: OrdersPage = (await response.json())["data"];
//     const orders = await analyzeAndGenerateOrders(data);

//     return json({ page: { orders, pageInfo: data.orders.pageInfo } });
//   } catch (error) {
//     console.error(error);
//     return null;
//   }
// };

export let lastQuery = undefined;

export const action: ActionFunction = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop, accessToken } = session;

  const formData = await request.formData();
  const action = formData.get("action") as string;
  const rawSession = formData.get("session") as string;
  const initial = formData.get("initial") as string;

  switch (action) {
    case "initial":
      const session = JSON.parse(rawSession) as ShopSession;
      if (initial === "true" && !session.fetched) {
        return fetchSession(shop);
      } else if (session.linked) {
        return paginate(formData, accessToken, admin, shop);
      } else {
        return json({
          type: "session",
          success: false,
          message: "Session not linked",
        });
      }
    case "fetchOrders":
      return paginate(formData, accessToken, admin, shop);
    case "refresh":
      return paginate(formData, accessToken, admin, shop, true);
    case "syncOrders":
      return syncOrders(formData, accessToken, admin, shop);
  }
};

async function fetchSession(shop: string) {
  const query = `query {

    findShop(shop: "${shop}"){
      name
      id
      settings{
        shopifyProductsSynced
        shopifyFulfillmentType
      }
    }
  }`;

  const response = await graphqlClient.request<FindShopResponse>(gql`
    ${query}
  `);

  // const webhooks = await admin.rest.resources.Webhook.all({
  //   session,
  //   limit: 20,
  // });

  // console.log(webhooks.data, "WEBHOOKS");

  if (response.findShop !== null) {
    return {
      success: true,
      type: "session",
      shop,
      merchant: response.findShop,
    };
  } else {
    return {
      success: false,
      type: "session",
      shop,
      message: "Failed",
    };
  }
}

async function syncOrders(
  formData: FormData,
  accessToken: string,
  admin: AdminApiContext,
  shop: string,
) {
  const orders: OrderDTO[] = JSON.parse(formData.get("orders") as string);
  const merchantId: number = parseInt(formData.get("merchantId") as string);

  try {
    const { createShopifyOrders } = await graphqlClient.request<{
      createShopifyOrders: {
        success: boolean;
        message: string;
        failedOrders?: number[];
      };
    }>(createOrdersMutation(), {
      input: { orders, merchantId },
    });

    const { success, message, failedOrders } = createShopifyOrders;

    if (success) {
      const response = await paginate(formData, accessToken, admin, shop, true);

      return {
        ...response,
        message,
        failedOrders,
      };
    }

    return { success, message, failedOrders };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Error syncing orders" };
  }
}

async function paginate(
  formData: FormData,
  accessToken: string,
  admin: AdminApiContext,
  shop: string,
  refresh?: boolean,
) {
  const cursor = formData.get("cursor");
  const direction = formData.get("direction");

  let query;

  if (!refresh) {
    if (direction === "next") {
      query = getOrdersQuery(undefined, cursor as string);
    } else if (direction === "previous") {
      query = getOrdersQuery(cursor as string, undefined);
    } else {
      query = getOrdersQuery();
    }
    lastQuery = query;
  } else {
    query = lastQuery;
  }

  try {
    const response = await admin.graphql(query);

    if (!response.ok) {
      throw new Error(`Error fetching orders: ${response.statusText}`);
    }

    const data: OrdersPage = (await response.json())["data"];

    const orders = await analyzeAndGenerateOrders(data);

    return refresh
      ? json({
          refreshed: true,
          page: { orders, pageInfo: data.orders.pageInfo },
          shop,
          accessToken,
        })
      : json({
          page: { orders, pageInfo: data.orders.pageInfo },
          shop,
          accessToken,
        });
  } catch (error) {
    console.error("ACTIONERROR", error);
    return null;
  }
}

const OrdersView = () => {
  const { shopSession, updateState } = useShopSession();

  const navigate = useNavigate();

  const actionData = useActionData<{
    orders: Orders;
    shop: string;
    accessToken: string;
  }>();
  const { state, dispatch } = useOrderContext();
  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState<boolean>(true);
  const [pageInfo, setPageInfo] = useState({
    hasNextPage: state.page?.pageInfo.hasNextPage ?? false,
    endCursor: state.page?.pageInfo.endCursor ?? "",
    startCursor: state.page?.pageInfo.startCursor ?? "",
    hasPreviousPage: state.page?.pageInfo.hasPreviousPage ?? false,
  });

  const fetcher = useFetcher<any>();

  useEffect(() => {
    if (initial) {
      setInitial(false);

      if (shopSession.fetched && state.page) {
        setLoading(false);
      } else {
        fetcher.submit(
          {
            action: "initial",
            session: JSON.stringify(shopSession),
            initial,
          },
          { method: "post" },
        );
      }
    } else if (fetcher.data) {
      if (fetcher.data.type === "session") {
        updateState({
          merchantInfo: fetcher.data?.merchant,
          shop: fetcher.data?.shop,
          linked: fetcher.data?.success ?? false,
          fetched: true,
        });

        if (state.page) {
          setLoading(false);
        } else if (fetcher.data?.success ?? false) {
          setLoading(true);
          fetcher.submit(
            {
              action: "fetchOrders",
              session: JSON.stringify(shopSession),
              initial,
            },
            { method: "post" },
          );
        }
      } else if (fetcher.data.page) {
        dispatch({ type: "SET_ORDERS", payload: fetcher.data.page });

        setPageInfo(fetcher.data.page.pageInfo);
        setLoading(false);
      }

      if (fetcher.data.message) {
        fetcher.submit({ action: "refresh", lastQuery }, { method: "post" });
        shopify.toast.show(fetcher.data.message);
      }

      if (fetcher.data.refreshed === true) {
        setLoading(false);
      }
    }
  }, [fetcher.data]);

  const handleOrderSelect = useCallback(
    (orderId, selected) => {
      dispatch({ type: "SELECT_ORDER", payload: { id: orderId, selected } });
    },
    [dispatch],
  );

  const handleSelectAll = () => {
    dispatch({ type: "SELECT_ALL_ORDERS" });
  };

  const handleDeselectAll = () => {
    dispatch({ type: "DESELECT_ALL_ORDERS" });
  };

  const handleSyncOrders = async () => {
    const orders = state.page.orders
      .filter((order) => state.selectedOrders.has(order.id))
      .map(({ valid, ...rest }) => rest);

    if (orders.length === 0) {
      shopify.toast.show("You did not select any orders to sync");
      return;
    }

    setLoading(true);
    fetcher.submit(
      {
        action: "syncOrders",
        orders: JSON.stringify(orders),
        merchantId: `${shopSession.merchantInfo.id}`,
      },
      { method: "post" },
    );
  };

  const handleNextPage = () => {
    if (pageInfo.hasNextPage) {
      setLoading(true);
      fetcher.submit(
        {
          action: "fetchOrders",
          cursor: pageInfo.endCursor,
          direction: "next",
        },
        { method: "post" },
      );
    }
  };

  const handlePreviousPage = () => {
    if (pageInfo.hasPreviousPage) {
      setLoading(true);
      fetcher.submit(
        {
          action: "fetchOrders",
          cursor: pageInfo.startCursor,
          direction: "previous",
        },
        { method: "post" },
      );
    }
  };

  return (
    <Page title="Merchant Orders">
      {loading ? (
        <Layout.Section>
          <Card>
            <Spinner aria-label="Loading orders" />
          </Card>
        </Layout.Section>
      ) : shopSession.linked === true ? (
        !(
          shopSession.merchantInfo?.settings?.shopifyProductsSynced ?? false
        ) ? (
          <Layout.Section>
            <Banner title="Desynced Products" tone="warning">
              <h3>
                It looks like your shop's products are not currently synced with
                Greenline's product inventory. To ensure seamless order
                processing, please navigate to the "Products" tab, then refresh
                and sync your product changes. This will align your shop’s
                inventory with Greenline, enabling accurate and up-to-date order
                synchronization.
              </h3>
            </Banner>
          </Layout.Section>
        ) : (
          <Layout.Section>
            <Card>
              <div>
                <InlineStack>
                  <Button onClick={handleSelectAll} disabled={!state.canSelect}>
                    Select All
                  </Button>
                  <div style={{ padding: "5px" }}></div>
                  <Button
                    onClick={handleDeselectAll}
                    disabled={!state.canSelect}
                  >
                    Deselect All
                  </Button>
                  <div style={{ marginLeft: "auto" }}>
                    <Button variant="primary" onClick={handleSyncOrders}>
                      Sync Orders
                    </Button>
                  </div>
                </InlineStack>
                <div style={{ padding: "5px" }}></div>
                {state.page && state.page.orders.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(350px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {state.page.orders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onSelect={handleOrderSelect}
                      />
                    ))}
                  </div>
                ) : (
                  <Text as="h2">No orders found</Text>
                )}
                <Pagination
                  hasPrevious={pageInfo.hasPreviousPage}
                  onPrevious={handlePreviousPage}
                  hasNext={pageInfo.hasNextPage}
                  onNext={handleNextPage}
                />
              </div>
            </Card>
          </Layout.Section>
        )
      ) : (
        <Banner
          title="Merchant not linked"
          action={{
            content: "Link Merchant",
            onAction: () => {
              navigate("/app");
            },
          }}
          tone="critical"
        >
          <h3>You need to link a merchant account to sync orders.</h3>
          <h3>Click the link merchant button to link a merchant account.</h3>
        </Banner>
      )}
    </Page>
  );
};

export default OrdersView;

interface OrderCardProps {
  order: OrderDTO;
  onSelect: (id: string, newChecked: boolean) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onSelect }) => {
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const {
    id,
    name,
    valid,
    synced,
    createdAt,
    totalPrice,
    orderType,
    orderItems,
    customerDetails,
    currencyCode,
    shippingDetails,
  } = order;

  const { state } = useOrderContext();
  const selected = state.selectedOrders.has(id);

  return (
    <div style={{ padding: "5px" }}>
      <Card>
        <Layout>
          <Layout.Section>
            <InlineStack blockAlign="start">
              {!synced && valid && (
                <Checkbox
                  checked={selected}
                  onChange={(newChecked) => onSelect(id, newChecked)}
                  label=""
                />
              )}
              <div>
                <InlineStack>
                  <Text as="p" variant="headingSm">
                    {name}
                  </Text>
                  <div style={{ padding: "5px" }} />
                  <Badge size="medium">{capitalize(orderType)}</Badge>
                </InlineStack>
                <div style={{ padding: "5px" }} />
                {order.originalId && (
                  <Text as="p" variant="headingSm">
                    Greenline ID: #{order.originalId}
                  </Text>
                )}
              </div>

              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                <div>
                  <Badge tone={order.synced === true ? "success" : "critical"}>
                    {order.synced === true ? `Synced` : "Not Synced"}
                  </Badge>
                </div>
                <div style={{ padding: "5px" }} />
                <div>
                  <Badge tone={order.valid === true ? "success" : "critical"}>
                    {order.valid === true
                      ? "Valid"
                      : generateMissingReason(order)}
                  </Badge>
                </div>
              </div>
            </InlineStack>

            <div style={{ margin: "10px" }}></div>
            {customerDetails && (
              <div style={{ marginBottom: "8px" }}>
                <Text as="p" variant="headingSm">
                  Customer
                </Text>
                <Text as="p">
                  {customerDetails?.firstName ?? ""}{" "}
                  {customerDetails?.lastName ?? ""} (
                  {customerDetails?.email ?? "No email"})
                </Text>
              </div>
            )}
            <div style={{ marginBottom: "8px" }}>
              <Text as="p" variant="headingSm">
                Shipping
              </Text>
              {(shippingDetails?.address1 || shippingDetails?.address2) && (
                <Text as="p">
                  {shippingDetails.address1 ?? shippingDetails.address2},{" "}
                  {shippingDetails.city}, {shippingDetails.country}
                </Text>
              )}
            </div>
            <Text as="p" variant="headingSm">
              {order.orderItems.length} Order Items
            </Text>
            {order.childOrder && (
              <InlineStack>
                <div style={{ marginLeft: "auto" }}>
                  <Text as="p" variant="headingSm">
                    Expects a return{" "}
                  </Text>
                </div>
              </InlineStack>
            )}
            <InlineStack blockAlign="start">
              <Text as="p">{order.totalPrice} EGP</Text>
              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                {synced && (
                  <div>
                    <Button
                      tone="success"
                      size="slim"
                      icon={ShareIcon}
                      onClick={() => {
                        window.open(
                          `https://greenlineco.site/orderinfo?type=merchant&orderId=${order.originalId}`,
                          "_blank",
                        );
                      }}
                    >
                      View in Greenline
                    </Button>
                  </div>
                )}
              </div>
            </InlineStack>
          </Layout.Section>
        </Layout>
      </Card>
    </div>
  );
};

export function generateMissingReason(order: OrderDTO): string {
  if (!order.valid) {
    if (!order.customerDetails) {
      return "Missing customer details";
    } else if (
      order.shippingDetails?.address1 === null &&
      order.shippingDetails?.address2 === null
    ) {
      return "Missing shipping address";
    } else if (order.shippingDetails?.city === null) {
      return "Missing city";
    } else if (order.shippingDetails?.country === null) {
      return "Missing country";
    } else if (order.customerDetails?.phone === null) {
      return "Missing phone number";
    }
  }

  return "Unknown";
}
