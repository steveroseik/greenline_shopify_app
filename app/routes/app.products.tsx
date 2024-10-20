import { Decimal } from "@prisma/client/runtime/library";
import {
  ActionFunctionArgs,
  LoaderFunction,
  LoaderFunctionArgs,
  json,
} from "@remix-run/node";
import {
  useLoaderData,
  useActionData,
  useSubmit,
  Form,
  useNavigate,
  useFetcher,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  InlineStack,
  Box,
  Badge,
  Banner,
  Modal,
  BlockStack,
  Spinner,
  Image,
  Text,
  Button,
  ProgressBar,
} from "@shopify/polaris";
import { useRef, useState, useCallback, useContext, useEffect } from "react";
import { productContextData, ProductsContext } from "~/context/productsContext";
import {
  Edge,
  ProductsPage,
  EdgeNode,
  VariantsNode,
} from "~/interface/Product/productsPageInterface";
import { authenticate, apiVersion } from "~/shopify.server";
import { graphqlClient } from "./app";
import { gql } from "graphql-request";
import { Item, ItemVariant } from "~/interface/Product/itemObject.interface";
import { ShopSession, useShopSession } from "~/session/shop-session";
import { Message } from "@shopify/polaris/build/ts/src/components/TopBar/components/Menu/components";
import { findItemsWithShopifyIdResponse } from "~/interface/Product/find-items-with-shopify-id";
import { analyseProducts } from "~/functions/productAnalysis";
import { FindShopResponse } from "~/interface/Shop/find-shop";
import { RefreshIcon } from "@shopify/polaris-icons";
import { sleep } from "~/sleep-func";
import { SyncShopifyItemsResponse } from "~/interface/Product/sync-shopify-items.response";

export interface ProductsResponse extends productContextData {
  data: Edge[];
}

function hasUpdates(state: productContextData) {
  return (
    state.itemsToAdd.length > 0 ||
    state.itemsToUpdate.length > 0 ||
    state.itemsToRemove.length > 0 ||
    state.variantsToAdd.length > 0 ||
    state.variantsToUpdate.length > 0 ||
    state.variantsToRemove.length > 0
  );
}

function setQuery(nextPageCursor?: string) {
  return `
    query{ 
      products(first: 10, sortKey: CREATED_AT, reverse: true, ${nextPageCursor ? `after: "${nextPageCursor}"` : ""}){
        edges{
              node{
                  id
                title
                handle
                description
                priceRangeV2{
                  minVariantPrice{
                    amount
                    currencyCode
                  }
                  maxVariantPrice{
                    amount
                    currencyCode
                  }
                }
                images(first:1){
                  nodes{
                    url
                  }
                }
                variants(first: 100){
                  nodes{
                      id
                      sku
                      title
                      price
                      selectedOptions{
                        name
                        value
                      }
                      displayName
                      availableForSale
                      compareAtPrice
                      image{
                        url
                      }
                    }
                }
                  handle
                  title
                  description
                  priceRangeV2{
                    minVariantPrice{ 
                      amount
                      currencyCode
                    }
                  }
                }
            }
            pageInfo {
                hasNextPage,
                endCursor
            }
      }
    }
    `;
}

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

export const action = async ({ request }: ActionFunctionArgs): Promise<any> => {
  try {
    const { admin, session } = await authenticate.admin(request);

    const { shop, accessToken } = session;

    const body = await request.formData();

    const rawState = body.get("state");
    const state: productContextData = JSON.parse(rawState as string);

    const lastFetched = body.get("lastFetched");

    const initial = body.get("initial");

    const rawSession = body.get("session");

    const action = body.get("action");

    if (action === "initial") {
      const shopSession = JSON.parse(rawSession as string) as ShopSession;
      if (initial == "true" && !shopSession.fetched) {
        return await fetchSession(shop);
      } else if (
        shopSession.linked &&
        (!lastFetched || lastFetched === "undefined" || lastFetched === "null")
      ) {
        return await analyse(accessToken, shop);
      } else {
        return json({ success: false, message: "Session not linked" });
      }
    } else if (action === "fetchProducts") {
      return await analyse(accessToken, shop);
    } else if (action === "sync") {
      console.log("SYNCING PORTION, ", state.lastSyncedIndex);
      return await syncPortion(state.data, shop, state.lastSyncedIndex);
    }
  } catch (e) {
    console.log("ERROR AT TRIAL: ", e);
    return { type: "sync", success: false, message: e };
  }
};

async function sync(
  payload: {
    itemsToAdd: EdgeNode[];
    itemsToUpdate: EdgeNode[];
    goodItems: EdgeNode[];
    itemsToRemove: Item[];
    variantsToAdd: VariantsNode[];
    variantsToUpdate: VariantsNode[];
    variantsToRemove: ItemVariant[];
    variantOptionsToAdd: string[];
    variantNamesToAdd: string[];
    invalidVariants: VariantsNode[];
  },
  shop: string,
) {
  const query = `
  mutation ($input: SyncShopifyProductsInput!){
     syncShopifyProducts(input: $input)
  }
  `;

  try {
    const response =
      await graphqlClient.request<SyncShopifyItemsResponse | null>(
        gql`
          ${query}
        `,
        { input: { shopifyId: shop, ...payload } },
      );

    console.log(response);
    return {
      type: "sync",
      success: response.syncShopifyProducts.success,
      data: response.syncShopifyProducts.data,
      message: response.syncShopifyProducts.message,
    };
  } catch (e) {
    console.log(e);
    return { type: "sync", success: false, message: e };
  }
}

async function syncPortion(
  products: Edge[],
  shop: string,
  lastSyncedIndex?: number,
) {
  const end =
    Math.min(10, products.length - (lastSyncedIndex ?? 0)) +
    (lastSyncedIndex ?? 0);
  const portion = products.slice(lastSyncedIndex ?? 0, end);

  try {
    const {
      itemsToAdd,
      itemsToUpdate,
      goodItems,
      itemsToRemove,
      variantsToAdd,
      variantsToUpdate,
      variantsToRemove,
      variantOptionsToAdd,
      variantNamesToAdd,
      invalidVariants,
    } = await analyseProducts(portion);

    if (
      itemsToAdd.length == 0 &&
      itemsToUpdate.length == 0 &&
      itemsToRemove.length == 0 &&
      variantsToAdd.length == 0 &&
      variantsToUpdate.length == 0 &&
      variantsToRemove.length == 0
    ) {
      return {
        type: "sync",
        success: true,
        message: "No updates",
        lastSyncedIndex: end,
        hasNext: end < products.length - 1,
      };
    }

    const response = await sync(
      {
        itemsToAdd,
        itemsToUpdate,
        goodItems,
        itemsToRemove,
        variantsToAdd,
        variantsToUpdate,
        variantsToRemove,
        variantOptionsToAdd,
        variantNamesToAdd,
        invalidVariants,
      },
      shop,
    );

    return {
      ...response,

      type: "sync",
      lastSyncedIndex: end,
      hasNext: end < products.length - 1,
    };
  } catch (e) {
    console.log(e);
    return {
      type: "sync",
      success: false,
      message: e,
      lastSyncedIndex: end,
      hasNext: end < products.length - 1,
    };
  }
}

async function analyse(accessToken: string, shop: string) {
  try {
    let nextPageCursor: string = undefined;
    let query = setQuery(nextPageCursor);

    const productEdges: Edge[] = [];

    let trial = 0;
    do {
      const response = await fetch(
        `https://${shop}/admin/api/${apiVersion}/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/graphql",
            "X-Shopify-Access-Token": accessToken!,
          },
          body: query,
        },
      );

      if (!response.ok) {
        trial++;
      }

      if (response.ok) {
        const jsonResponse: ProductsPage = await response.json();
        productEdges.push(...jsonResponse.data.products.edges);

        if (jsonResponse.data.products.pageInfo.hasNextPage) {
          nextPageCursor = jsonResponse.data.products.pageInfo.endCursor;
          query = setQuery(nextPageCursor);
        } else {
          break;
        }
      }
    } while (trial < 10);

    const {
      itemsToAdd,
      itemsToUpdate,
      goodItems,
      itemsToRemove,
      variantsToAdd,
      variantsToUpdate,
      variantsToRemove,
      variantOptionsToAdd,
      variantNamesToAdd,
      invalidVariants,
    } = await analyseProducts(productEdges);

    return {
      type: "analysis",
      data: productEdges,
      itemsToAdd,
      itemsToUpdate,
      goodItems,
      itemsToRemove,
      variantsToAdd,
      variantsToUpdate,
      variantsToRemove,
      variantOptionsToAdd,
      variantNamesToAdd,
      invalidVariants,
    };
  } catch (e) {
    console.log(e);
    return null;
  }
}
export const Collections = () => {
  const actionData = useActionData<typeof action>();

  const { shopSession, updateState } = useShopSession();
  const navigate = useNavigate();

  const fetcher = useFetcher<any>();

  const [loading, setLoading] = useState<boolean>(true);

  const [sessionLoading, setSessionLoading] = useState<boolean>(true);

  const [initial, setInitial] = useState<boolean>(true);

  const [active, setActive] = useState(false);

  const handleChange = useCallback(() => setActive(!active), [active]);

  const { state, dispatch } = useContext<{
    state: productContextData;
    dispatch: Function;
  }>(ProductsContext);

  useEffect(() => {
    if (initial) {
      setInitial(false);

      if (shopSession.linked && state.lastFetched) {
        setLoading(false);
        setSessionLoading(false);
      } else {
        fetcher.submit(
          {
            action: "initial",
            initial,
            session: JSON.stringify(shopSession),
            lastFetched: JSON.stringify(state.lastFetched),
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

        setSessionLoading(false);

        if (!state.lastFetched) {
          fetcher.submit(
            {
              action: "fetchProducts",
            },
            { method: "post" },
          );
          setLoading(true);
        } else {
          setLoading(false);
        }
      } else if (fetcher.data.type === "analysis") {
        console.log(
          "Analysis",
          fetcher.data.data.map((e) => e.node.title),
        );
        dispatch({
          type: "OVERWRITE_ALL",
          payload: fetcher.data,
        });

        setLoading(false);

        if (sessionLoading) setSessionLoading(false);
        if (loading) setLoading(false);
      } else if (fetcher.data.type === "sync") {
        if (fetcher.data.success === true) {
          if (fetcher.data.hasNext) {
            dispatch({
              type: "CONTINUE_SYNC",
              payload: { endIndex: fetcher.data.lastSyncedIndex },
            });

            console.log("Updated last index: ", state.lastSyncedIndex);

            fetcher.submit(
              {
                action: "sync",
                state: JSON.stringify({
                  ...state,
                  lastSyncedIndex: fetcher.data.lastSyncedIndex,
                }),
              },
              { method: "post" },
            );
            if (typeof fetcher.data.message == "string") {
              shopify.toast.show(
                `${fetcher.data.message ?? "An error occured"}`,
              );
            } else {
              shopify.toast.show(`"An error occured"`);
            }
          } else {
            dispatch({ type: "END_SYNC" });
            dispatch({ type: "RESET" });
            shopify.toast.show("Sync Successful");
            fetcher.submit(
              {
                action: "fetchProducts",
              },
              { method: "POST" },
            );
          }
          if (typeof fetcher.data.message == "string") {
            shopify.toast.show(`${fetcher.data.message ?? "An error occured"}`);
          } else {
            shopify.toast.show(`"An error occured"`);
          }
        } else {
          dispatch({ type: "END_SYNC" });
          if (loading) setLoading(false);
          if (typeof fetcher.data.message == "string") {
            shopify.toast.show(`${fetcher.data.message ?? "An error occured"}`);
          } else {
            shopify.toast.show(`"An error occured"`);
          }
        }
      }
    }
  }, [fetcher.data]);

  return (
    <Page title="Merchant Products">
      {sessionLoading ? (
        <Layout.Section>
          <div style={{ alignContent: "center" }}>
            <Card>
              <div style={{ alignContent: "center" }}>
                <Spinner
                  accessibilityLabel="Loading form field"
                  hasFocusableParent={false}
                />
              </div>
            </Card>
          </div>
        </Layout.Section>
      ) : !shopSession.linked ? (
        <Banner
          title={`Merchant not linked`}
          action={{
            content: "Link Merchant",
            onAction: () => {
              navigate("/app");
            },
          }}
          tone="critical"
        >
          <h3>You need to link a merchant account to sync products.</h3>
          <h3>Click the link merchant button to link a merchant account.</h3>
        </Banner>
      ) : (
        <>
          {state.lastFetched && (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end", // Aligns elements to the right
                }}
              >
                <div style={{ marginBottom: "8px" }}>
                  <Button
                    icon={RefreshIcon}
                    tone="success"
                    onClick={() => {
                      setLoading(true);
                      fetcher.submit(
                        {
                          action: "fetchProducts",
                        },
                        { method: "POST" },
                      );
                    }}
                  >
                    Refetch
                  </Button>
                </div>
                <div>
                  <Badge>{`Last Fetched: ${state.lastFetched}`}</Badge>
                </div>
              </div>
            </>
          )}

          <Layout.Section>
            <Card>
              <div>
                <InlineStack>
                  <div>
                    <Box padding="150">
                      <Badge tone="critical-strong">
                        {`${state.invalidVariants.length} Variants without images`}
                      </Badge>
                    </Box>
                  </div>
                  <div>
                    <Box padding="150">
                      <Badge tone="info">
                        {`${state.itemsToAdd.length} Products to add`}
                      </Badge>
                    </Box>
                  </div>
                  <div>
                    <Box padding="150">
                      <Badge tone="success">
                        {`${state.itemsToUpdate.length} Products to update info`}
                      </Badge>
                    </Box>
                  </div>
                  <div>
                    <Box padding="150">
                      <Badge tone="warning">
                        {`${state.itemsToRemove.length} Products to Remove`}
                      </Badge>
                    </Box>
                  </div>
                  <div>
                    <Box padding="150">
                      <Badge tone="success">
                        {`${state.variantsToAdd.length} Variants to add to existing Products`}
                      </Badge>
                    </Box>
                  </div>
                  <div>
                    <Box padding="150">
                      <Badge tone="info">
                        {`${state.variantsToUpdate.length} Variants to update in existing products`}
                      </Badge>
                    </Box>
                  </div>
                  <div>
                    <Box padding="150">
                      <Badge tone="warning">
                        {`${state.variantsToRemove.length} Variants to remove from exisiting products`}
                      </Badge>
                    </Box>
                  </div>
                </InlineStack>
              </div>
              {!loading &&
                hasUpdates(state) &&
                state.invalidVariants.length == 0 && (
                  <div>
                    <Banner
                      title="Order Processing On Hold"
                      action={{
                        disabled: !hasUpdates(state),
                        content: "Sync Products",
                        onAction: hasUpdates(state) ? handleChange : null,
                      }}
                      tone="warning"
                    >
                      <h3>
                        Syncronize products to be able to process orders again.
                      </h3>
                    </Banner>
                  </div>
                )}
              {!loading && state.invalidVariants.length > 0 && (
                <div>
                  <Banner
                    title="Invalid Product Variants"
                    action={{
                      disabled: !hasUpdates(state),
                      content: "Sync Valid Products",
                      onAction: hasUpdates(state) ? handleChange : null,
                    }}
                    tone="critical"
                  >
                    <h3>
                      You need to fix all variants without images to make the
                      sync successful and be able to <b>process orders</b>. Way
                      to fix invalid variants:
                    </h3>
                    <ol>
                      <li>Add an image for the variant</li>
                      <li>
                        Add an image for the parent product of the variant
                      </li>
                      <li>Remove the variant</li>
                    </ol>
                  </Banner>
                </div>
              )}
            </Card>
          </Layout.Section>
          <Form method="post">
            <input type="hidden" name="state" value={JSON.stringify(state)} />
            <Modal
              open={active}
              onClose={handleChange}
              title={
                state.invalidVariants.length > 0
                  ? "Risky Action"
                  : "Sync Confirmation"
              }
              primaryAction={{
                content: "Cancel",
                onAction: () => {
                  handleChange();
                },
              }}
              secondaryActions={[
                {
                  content: "Proceed With Sync",
                  onAction: () => {
                    setLoading(true);
                    handleChange();
                    dispatch({ type: "START_SYNC" });
                    const formData = new FormData();
                    formData.append("state", JSON.stringify(state));
                    formData.append("action", "sync");

                    fetcher.submit(formData, { method: "post" });
                  },
                },
              ]}
            >
              <Modal.Section>
                <BlockStack>
                  {state.invalidVariants.length > 0 ? (
                    <Banner tone="critical">
                      <div style={{ padding: "25px" }}>
                        <p>
                          Be Aware that you have {state.invalidVariants.length}{" "}
                          variants without images
                        </p>
                        <p>
                          This means if you proceed these actions will apply on
                          these variants
                        </p>
                        <ol>
                          <li>
                            Orders will still be on hold until these variants
                            are fixed.
                          </li>
                          <li>
                            If variant already existed in Greenline system, it
                            will be removed
                          </li>
                          <li>
                            If variant did not exist, it will not be synced with
                            Greenline system
                          </li>
                        </ol>
                      </div>
                    </Banner>
                  ) : (
                    <Banner>
                      <div style={{ padding: "25px" }}>
                        <p>
                          Please make sure your products are updated correctly,
                          this action cannot be undone unless you manually
                          revert the changes from your shopify products.
                        </p>
                      </div>
                    </Banner>
                  )}
                </BlockStack>
              </Modal.Section>
            </Modal>
          </Form>

          {loading ? (
            state.syncing ? (
              <SyncingProductsScreen
                totalProducts={state.data.length}
                syncedProducts={state.lastSyncedIndex}
              />
            ) : (
              <LoadingScreen />
            )
          ) : (
            <Layout.Section variant="oneThird">
              <Card>
                {state.data.map((edge: Edge) => {
                  const item = edge.node;
                  return item.variants.nodes.map((variant) => {
                    return (
                      <div style={{ padding: 5 }}>
                        <Card>
                          <InlineStack>
                            <div>
                              {variant.image != null && (
                                <Image
                                  width={50}
                                  source={variant.image.url ?? ""}
                                  alt={"image"}
                                ></Image>
                              )}
                            </div>
                            <div style={{ paddingLeft: 5 }}>
                              <Text as={"h2"}>{variant.displayName}</Text>
                              <Text as={"h6"}>
                                <div style={{ color: "#afafaf" }}>
                                  {variant.sku}
                                </div>
                              </Text>
                              <Badge
                                tone={
                                  variant.synced == true
                                    ? "success"
                                    : "critical"
                                }
                              >
                                {variant.synced == true
                                  ? "Synced"
                                  : state.variantsToUpdate.includes(variant)
                                    ? "Out Of Date"
                                    : "New"}
                              </Badge>
                            </div>
                            <div style={{ marginLeft: "auto" }}>
                              {variant.image === null &&
                                !item.images.nodes.find(
                                  (e) => e.url != undefined,
                                )?.url && (
                                  <Badge tone="critical-strong">
                                    Missing Image
                                  </Badge>
                                )}
                            </div>
                          </InlineStack>
                        </Card>
                      </div>
                    );
                  });
                })}
              </Card>
            </Layout.Section>
          )}
        </>
      )}
    </Page>
  );
};

const Placeholder = ({
  label = "",
  height = "auto",
  width = "auto",
  showBorder = false,
}) => {
  return (
    <div
      style={{
        background: "var(--p-color-text-info)",
        padding: "14px var(--p-space-200)",
        height: height,
        width: width,
        borderBlockEnd: showBorder
          ? "1px dashed var(--p-color-bg-surface-success)"
          : "none",
      }}
    >
      <InlineStack align="center">
        <div
          style={{
            color: "var(--p-color-text-info-on-bg-fill)",
          }}
        >
          <Text
            as="h2"
            variant="bodyMd"
            fontWeight="regular"
            tone="text-inverse"
          >
            {label}
          </Text>
        </div>
      </InlineStack>
    </div>
  );
};

const LoadingScreen = () => {
  const bannerRef = useRef(null);

  useEffect(() => {
    // Show the banner after 10 seconds if it is still loading
    const timer = setTimeout(() => {
      if (bannerRef.current) {
        bannerRef.current.style.display = "block";
      }
    }, 10000);

    // Cleanup timer if the component unmounts before 10 seconds
    return () => clearTimeout(timer);
  }, []);

  return (
    <Layout.Section>
      <Card>
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Spinner accessibilityLabel="Loading Products" size="large" />
          <h1 style={{ margin: "10px 0" }}>
            Loading your products and variants...
          </h1>
          <Text as="p" variant="bodyMd" alignment="center">
            The loading time may vary depending on the number of products and
            variants you have in your store.
          </Text>
          <div style={{ margin: "10px 0" }} />
          <Text as="p" variant="bodyMd" alignment="center">
            Please don't close this page to ensure everything is loaded
            correctly.
          </Text>
          <div style={{ margin: "20px 0" }} />
          <div ref={bannerRef} style={{ display: "none" }}>
            <Banner
              title="Why is this taking time?"
              tone="info"
              onDismiss={() => {
                if (bannerRef.current) {
                  bannerRef.current.style.display = "none";
                }
              }}
            >
              <p>
                Our system is retrieving all product data and variant details
                from Shopify. For stores with a large inventory, this may take a
                little longer. Thank you for your patience!
              </p>
            </Banner>
          </div>
        </div>
      </Card>
    </Layout.Section>
  );
};

const SyncingProductsScreen = ({ totalProducts, syncedProducts }) => {
  const [progress, setProgress] = useState(0);

  // Calculate the progress percentage
  useEffect(() => {
    if (totalProducts > 0) {
      const progressPercentage = (syncedProducts / totalProducts) * 100;
      setProgress(progressPercentage);
    }
  }, [syncedProducts, totalProducts]);

  return (
    <Layout.Section>
      <Card>
        <div style={{ padding: "20px", textAlign: "center" }}>
          <Spinner accessibilityLabel="Loading Products" size="large" />
          <Text as="h2" variant="headingMd">
            Syncing Products
          </Text>
          <Text variant="bodyMd" as="h3">
            {`Synced ${syncedProducts} out of ${totalProducts} products.`}
          </Text>
          <ProgressBar progress={progress} size="small" />
          <Text
            variant="bodyMd"
            as="h5"
          >{`${Math.round(progress)}% completed`}</Text>
        </div>
      </Card>
    </Layout.Section>
  );
};

export default Collections;
