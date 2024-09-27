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
                images(first:20){
                  nodes{
                    url
                  }
                }
                variants(first: 10){
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

export const action = async ({ request }: ActionFunctionArgs): Promise<any> => {
  try {
    const { admin, session } = await authenticate.admin(request);

    const { shop, accessToken } = session;

    const body = await request.formData();

    const rawState = body.get("state");

    if (!rawState) throw Error("No state found");

    const state: productContextData = JSON.parse(rawState as string);

    const query = `
  mutation ($input: SyncShopifyProductsInput!){
     syncShopifyProducts(input: $input)
  }
  `;
    const response =
      await graphqlClient.request<findItemsWithShopifyIdResponse | null>(
        gql`
          ${query}
        `,
        { input: { shopifyId: shop, ...state } },
      );

    return json({ success: true });
  } catch (e) {
    console.log("ERROR AT TRIAL: ", e);
    return json({ success: false, message: e });
  }
};

export const loader: LoaderFunction = async ({
  params,
  request,
}: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const { shop, accessToken } = session;

  console.log(shop);

  try {
    let nextPageCursor: string = undefined;
    let query = setQuery(nextPageCursor);
    const itemsToAdd: EdgeNode[] = [];
    const itemsToUpdate: EdgeNode[] = [];
    const goodItems: EdgeNode[] = [];
    let itemsToRemove: Item[] = [];
    const variantsToAdd: VariantsNode[] = [];
    const variantsToUpdate: VariantsNode[] = [];
    let variantsToRemove: ItemVariant[] = [];
    const variantOptionsToAdd: string[] = [];
    const variantNamesToAdd: string[] = [];
    const invalidVariants: VariantsNode[] = [];
    const productEdges: Edge[] = [];

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

      console.log(`response status: ${response.status}`);

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
    } while (true);

    await analyseProducts(
      productEdges,
      goodItems,
      itemsToAdd,
      itemsToUpdate,
      itemsToRemove,
      variantsToAdd,
      variantsToUpdate,
      variantsToRemove,
      variantOptionsToAdd,
      variantNamesToAdd,
      invalidVariants,
    );

    return {
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
};

const Collections = () => {
  const { shopSession, updateState } = useShopSession();
  const navigate = useNavigate();

  return (
    <>
      {shopSession.linked === true ? (
        <CollectionContent />
      ) : (
        <Page>
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
        </Page>
      )}
    </>
  );
};

const CollectionContent = () => {
  const response = useLoaderData<ProductsResponse>();

  const actionData = useActionData<typeof action>();

  console.log(actionData, "actionData");

  const submit = useSubmit();

  const [loading, setLoading] = useState<boolean>(true);

  const [active, setActive] = useState(false);

  const handleChange = useCallback(() => setActive(!active), [active]);

  const { state, dispatch } = useContext<{
    state: productContextData;
    dispatch: Function;
  }>(ProductsContext);

  console.log(state, "state");

  useEffect(() => {
    console.log("DISPATCHINGGGG", actionData);

    if (response) {
      dispatch({
        type: "OVERWRITE_ALL",
        payload: response,
      });
      setLoading(false);
    }

    if (actionData) {
      if (actionData?.success === true) {
        dispatch({ type: "RESET" });
        shopify.toast.show("Sync Successful");
      } else {
        if (actionData?.success == false) {
          if (actionData?.message instanceof String) {
            shopify.toast.show(`${actionData?.message ?? "An error occured"}`);
          } else {
            shopify.toast.show(`"An error occured"`);
          }
        }
      }
      if (loading) setLoading(false);
    }
  }, [actionData]);

  return (
    <Page>
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
                  You need to fix all variants without images to make the sync
                  successful and be able to <b>process orders</b>. Way to fix
                  invalid variants:
                </h3>
                <ol>
                  <li>Add an image for the variant</li>
                  <li>Add an image for the parent product of the variant</li>
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
                console.log("PROCEEDING", state);
                setLoading(true);
                handleChange();
                const formData = new FormData();
                formData.append("state", JSON.stringify(state));

                submit(formData, { method: "post" });
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
                        Orders will still be on hold until these variants are
                        fixed.
                      </li>
                      <li>
                        If variant already existed in Greenline system, it will
                        be removed
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
                      Please make sure your products are updated correctly, this
                      action cannot be undone unless you manually revert the
                      changes from your shopify products.
                    </p>
                  </div>
                </Banner>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>
      </Form>
      {loading ? (
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
      ) : (
        <Layout.Section variant="oneThird">
          <Card>
            {response.data.map((edge: Edge) => {
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
                              variant.synced == true ? "success" : "critical"
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
                            !item.images.nodes.find((e) => e.url != undefined)
                              ?.url && (
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

export default Collections;
