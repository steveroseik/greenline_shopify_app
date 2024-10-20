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
        return json({ success: false, message: "Session not linked" });
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
    }
  }`;

  const response = await graphqlClient.request<FindShopResponse>(gql`
    ${query}
  `);

  console.log(response, "RESPONSE");

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
  const merchantId = parseInt(formData.get("merchantId") as string);

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

  console.log("Cursor:", cursor);
  console.log("Direction:", direction);

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
    console.log("LAST QUERY", query);
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
    hasNextPage: false,
    endCursor: "",
    startCursor: "",
    hasPreviousPage: false,
  });

  const fetcher = useFetcher<any>();

  useEffect(() => {
    console.log("INIT? ", initial);
    console.log("fetched", fetcher.data);
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
        } else {
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
        console.log("fetcher.data", fetcher.data);
        console.log("next_info", fetcher.data.page.pageInfo);
        setPageInfo(fetcher.data.page.pageInfo);
        setLoading(false);
      }

      if (fetcher.data.message) {
        fetcher.submit({ action: "refresh", lastQuery }, { method: "post" });
        shopify.toast.show(fetcher.data.message);
      }

      if (fetcher.data.refreshed === true) {
        console.log("REFRESHED :::: :: : :::: :: :::: : ::");
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
      console.log("Previous page", pageInfo);
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
        <Layout.Section>
          <Card>
            <div>
              <InlineStack>
                <Button onClick={handleSelectAll} disabled={!state.canSelect}>
                  Select All
                </Button>
                <div style={{ padding: "5px" }}></div>
                <Button onClick={handleDeselectAll} disabled={!state.canSelect}>
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
                <div>
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
              <Text as="p" variant="headingSm">
                {name} ({orderType})
              </Text>
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
                    {order.synced === true ? "Synced" : "Not Synced"}
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
            <div style={{ marginBottom: "8px" }}>
              <Text as="p" variant="headingSm">
                Customer
              </Text>
              <Text as="p">
                {customerDetails.firstName} {customerDetails.lastName} (
                {customerDetails.email})
              </Text>
            </div>
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
          </Layout.Section>
        </Layout>
      </Card>
    </div>
  );
};

export function generateMissingReason(order: OrderDTO): string {
  if (!order.valid) {
    if (
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
