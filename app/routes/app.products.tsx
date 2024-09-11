import { Decimal } from "@prisma/client/runtime/library";
import { ActionFunctionArgs, LoaderFunction, json } from "@remix-run/node";
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

export interface ProductsResponse extends productContextData {
  data: Edge[];
}

interface findItemsWithShopifyIdResponse {
  findItemsWithShopifyId: Item[] | null;
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

async function analyseProducts(
  jsonResponse: ProductsPage,
  goodItems: EdgeNode[],
  itemsToAdd: EdgeNode[],
  itemsToUpdate: EdgeNode[],
  itemsToRemove: Item[],
  variantsToAdd: VariantsNode[],
  variantsToUpdate: VariantsNode[],
  variantsToRemove: ItemVariant[],
  variantOptionsToAdd: string[],
  variantNamesToAdd: string[],
  invalidVariants: VariantsNode[],
) {
  const productsIds = jsonResponse.data.products.edges.map(
    (edge) => edge.node.id,
  );

  console.log(JSON.stringify(productsIds));

  console.log(
    `0 ============================== PP ${jsonResponse.data.products.edges.length} =============================================================`,
  );

  let itemQuery = `
        query($input: FindItemsWithShopifyIdInput!){
            findItemsWithShopifyId(input: $input){
              id
              merchantId
              shopifyId
              name
              currency
              imageUrl
              description
              currency
              itemVariants{
                id
                merchantId
                itemId
                name
                sku
                shopifyId
                isEnabled
                merchantSku
                imageUrl
                price
                selectedOptions{
                  id
                  variantOption{
                    id
                    value
                  }
                  variantName{
                    id
                    name
                  }
                }
              }
            }
          }
        `;

  /// get items from db
  const dbItems =
    await graphqlClient.request<findItemsWithShopifyIdResponse | null>(
      gql`
        ${itemQuery}
      `,
      { input: { ids: productsIds } },
    );

  console.log(dbItems, "dbItems");

  if (
    !dbItems?.findItemsWithShopifyId ||
    dbItems?.findItemsWithShopifyId.length == 0
  ) {
    /// if no items in db

    jsonResponse.data.products.edges.forEach((edge) => {
      edge.node.variants.nodes.forEach((variant) => {
        variant.synced = false;
        variant.invalid = false;
        /// check if variant has image
        if (variant.image == null) {
          /// if variant has no image, check if product has image
          if (edge.node.images.nodes.length > 0) {
            const element = edge.node.images.nodes.find((e) => e.url);
            if (element) {
              variant.image = element;
            } else {
              variant.invalid = true;
              invalidVariants.push(variant);
            }
          } else {
            variant.invalid = true;
            invalidVariants.push(variant);
          }
        }

        /// add variant options and names to add if not already added
        if (variant.invalid !== true) {
          if (variant.selectedOptions)
            variant.selectedOptions.forEach((option) => {
              option.name = option.name == "Title" ? "Default" : option.name;
              option.value =
                option.value == "Default Title" ? "Default" : option.value;
              if (!variantOptionsToAdd.includes(option.value)) {
                variantOptionsToAdd.push(option.value);
              }
              if (!variantNamesToAdd.includes(option.name)) {
                variantNamesToAdd.push(option.name);
              }
            });
        }
        return variant;
      });
    });
    console.log(
      "4 =============================================================================================================",
    );

    /// add items to add
    itemsToAdd.push(
      ...jsonResponse.data.products.edges
        .filter((edge) => {
          const newEdge: Edge = JSON.parse(JSON.stringify(edge));

          newEdge.node.variants.nodes = newEdge.node.variants.nodes.filter(
            (variant) => variant.invalid === false,
          );
          return newEdge.node.variants.nodes.length > 0;
        })
        .map((edge) => edge.node),
    );
  } else {
    /// if item in db

    jsonResponse.data.products.edges.forEach((edge) => {
      const item = dbItems.findItemsWithShopifyId?.find(
        (e) => e.shopifyId == edge.node.id,
      );
      if (item) {
        /// validate item info
        if (
          item.description == edge.node.description &&
          item.name == edge.node.title
        ) {
          goodItems.push(edge.node);
        } else {
          itemsToUpdate.push(edge.node);
        }
        /// validate item variants
        for (const variant of edge.node.variants.nodes) {
          const dbVariant = item.itemVariants.find(
            (v) => v.shopifyId == variant.id,
          );

          if (dbVariant) {
            console.log("variant check = == == == = === =");
            if (variant.image == null) {
              if (edge.node.images.nodes.length > 0) {
                const element = edge.node.images.nodes.find((e) => e.url);
                if (element) {
                  variant.image = element;
                } else {
                  variant.invalid = true;
                  variant.synced = false;
                  invalidVariants.push(variant);
                  variantsToRemove.push(dbVariant);
                  continue;
                }
              } else {
                variant.invalid = true;
                variant.synced = false;
                invalidVariants.push(variant);
                variantsToRemove.push(dbVariant);
                continue;
              }
            }
            for (const option of variant.selectedOptions) {
              const dbOption = dbVariant.selectedOptions.find(
                (o) =>
                  o.variantName.name ==
                  (option.name == "Title" ? "Default" : option.name),
              );

              if (dbOption) {
                if (
                  dbOption.variantOption.value ==
                  (option.value == "Default Title" ? "Default" : option.value)
                ) {
                  // check names
                  console.log(
                    `${dbVariant.merchantSku} - ${variant.sku} :: ${
                      dbVariant.merchantSku == variant.sku ||
                      variant.sku.length == 0
                    }`,
                  );

                  console.log(
                    `${new Decimal(dbVariant.price).toFixed(2)} - ${variant.price}`,
                  );
                  console.log(
                    `${dbVariant.isEnabled} - ${variant.availableForSale}`,
                  );
                  console.log(
                    `${
                      dbVariant.name
                    } - '${variant.title == "Default Title" ? "" : variant.title}'`,
                  );
                  if (
                    dbVariant.merchantSku == variant.sku ||
                    (variant.sku.length == 0 &&
                      new Decimal(dbVariant.price).toFixed(2) ==
                        variant.price &&
                      dbVariant.imageUrl == variant.image?.url &&
                      dbVariant.name ==
                        (variant.title == "Default Title"
                          ? ""
                          : variant.title) &&
                      dbVariant.isEnabled == variant.availableForSale)
                  ) {
                    variant.synced = true;
                  } else {
                    variantsToUpdate.push(variant);
                    variant.synced = false;
                  }
                } else {
                  variantsToRemove.push(dbVariant);
                  variant.itemId = item.id;
                  variant.itemName = item.name;
                  variantsToAdd.push(variant);
                  variant.synced = false;
                  variant.selectedOptions.forEach((option) => {
                    option.name =
                      option.name == "Title" ? "Default" : option.name;
                    option.value =
                      option.value == "Default Title"
                        ? "Default"
                        : option.value;
                    if (!variantOptionsToAdd.includes(option.value)) {
                      variantOptionsToAdd.push(option.value);
                    }
                    if (!variantNamesToAdd.includes(option.name)) {
                      variantNamesToAdd.push(option.name);
                    }
                  });
                  break;
                }
              } else {
                variantsToRemove.push(dbVariant);
                variant.itemId = item.id;
                variant.itemName = item.name;
                variantsToAdd.push(variant);
                variant.synced = false;
                variant.selectedOptions.forEach((option) => {
                  option.name =
                    option.name == "Title" ? "Default" : option.name;
                  option.value =
                    option.value == "Default Title" ? "Default" : option.value;
                  if (!variantOptionsToAdd.includes(option.value)) {
                    variantOptionsToAdd.push(option.value);
                  }
                  if (!variantNamesToAdd.includes(option.name)) {
                    variantNamesToAdd.push(option.name);
                  }
                });
                break;
              }
            }
          } else {
            if (variant.image == null) {
              if (edge.node.images.nodes.length > 0) {
                const element = edge.node.images.nodes.find((e) => e.url);
                if (element) {
                  variant.image = element;
                  variant.itemId = item.id;
                  variant.itemName = item.name;
                  variantsToAdd.push(variant);
                  variant.selectedOptions.forEach((option) => {
                    option.name =
                      option.name == "Title" ? "Default" : option.name;
                    option.value =
                      option.value == "Default Title"
                        ? "Default"
                        : option.value;
                    if (!variantOptionsToAdd.includes(option.value)) {
                      variantOptionsToAdd.push(option.value);
                    }
                    if (!variantNamesToAdd.includes(option.name)) {
                      variantNamesToAdd.push(option.name);
                    }
                  });
                  variant.synced = false;
                } else {
                  variant.invalid = true;
                  invalidVariants.push(variant);
                }
              } else {
                variant.invalid = true;
                invalidVariants.push(variant);
              }
            } else {
              variant.itemId = item.id;
              variant.itemName = item.name;
              variantsToAdd.push(variant);
              variant.selectedOptions.forEach((option) => {
                option.name = option.name == "Title" ? "Default" : option.name;
                option.value =
                  option.value == "Default Title" ? "Default" : option.value;
                if (!variantOptionsToAdd.includes(option.value)) {
                  variantOptionsToAdd.push(option.value);
                }
                if (!variantNamesToAdd.includes(option.name)) {
                  variantNamesToAdd.push(option.name);
                }
              });
              variant.synced = false;
            }
          }
        }
      } else {
        console.log(
          "7 =============================================================================================================",
        );

        let validItem = true;
        edge.node.variants.nodes = edge.node.variants.nodes.map((variant) => {
          variant.invalid = false;
          variant.synced = false;
          if (variant.image == null) {
            if (edge.node.images.nodes.length > 0) {
              const element = edge.node.images.nodes.find((e) => e.url);
              if (element) {
                variant.image = element;
                variant.invalid = false;
              } else {
                validItem = false;
                variant.invalid = true;
                invalidVariants.push(variant);
              }
            } else {
              validItem = false;
              variant.invalid = true;
              invalidVariants.push(variant);
            }
          }
          return variant;
        });

        if (validItem) itemsToAdd?.push(edge.node);
      }
    });

    itemsToRemove.push(
      ...dbItems.findItemsWithShopifyId.filter(
        (item) =>
          itemsToAdd.find((e) => e.id == item.shopifyId) == undefined &&
          goodItems.find((e) => e.id == item.shopifyId) == undefined,
      ),
    );

    const flatShopifyVariants = jsonResponse.data.products.edges
      .map((e) => e.node.variants.nodes)
      .flat();

    const otherVariantsToRemove = dbItems.findItemsWithShopifyId
      .map((e) => e.itemVariants)
      .flat()
      .filter(
        (e) =>
          flatShopifyVariants.find((v) => v.id == e.shopifyId) == undefined &&
          variantsToRemove.find((v) => v.shopifyId == e.shopifyId) == undefined,
      );
    variantsToRemove = [...variantsToRemove, ...otherVariantsToRemove];
  }
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
  const body = await request.formData();

  const state: productContextData = JSON.parse(body.get("state") as string);

  console.log(state, "STATE");

  console.log("ENTERING THE VOID");

  const { admin, session } = await authenticate.admin(request);

  const { shop, accessToken } = session;

  console.log("OUT OF THE VOID");

  try {
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

    console.log("variables", { shopifyId: shop, ...state });

    console.log(response, "RESPONSE");

    return json({ success: true });
  } catch (e) {
    console.log("ERROR AT TRIAL: ", e);
    return json({ success: false, message: e });
  }
};

export const loader: LoaderFunction = async ({ request }) => {
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

        if (jsonResponse) {
          await analyseProducts(
            jsonResponse,
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
        }

        if (jsonResponse.data.products.pageInfo.hasNextPage) {
          nextPageCursor = jsonResponse.data.products.pageInfo.endCursor;
          query = setQuery(nextPageCursor);
        } else {
          break;
        }
      }
    } while (true);

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

  const formRef = useRef(null);

  const [loading, setLoading] = useState<boolean>(true);

  const [active, setActive] = useState(false);

  const handleChange = useCallback(() => setActive(!active), [active]);

  const { state, dispatch } = useContext<{
    state: productContextData;
    dispatch: Function;
  }>(ProductsContext);

  console.log(state, "state");

  useEffect(() => {
    console.log("DISPATCHINGGGG");

    if (response) {
      setLoading(false);
    }

    if (actionData?.success === true) {
      dispatch({ type: "RESET" });
      shopify.toast.show("Sync Successful");
    } else {
      if (actionData?.success == false) {
        shopify.toast.show(`${actionData?.message ?? "An error occured"}`);
      }
    }

    dispatch({ type: "ADD_ITEMS_TO_ADD", payload: response.itemsToAdd });
    dispatch({ type: "ADD_ITEMS_TO_UPDATE", payload: response.itemsToUpdate });
    dispatch({ type: "ADD_GOOD_ITEMS", payload: response.goodItems });
    dispatch({ type: "ADD_ITEMS_TO_REMOVE", payload: response.itemsToRemove });
    dispatch({ type: "ADD_VARIANTS_TO_ADD", payload: response.variantsToAdd });
    dispatch({
      type: "ADD_VARIANTS_TO_UPDATE",
      payload: response.variantsToUpdate,
    });
    dispatch({
      type: "ADD_VARIANTS_TO_REMOVE",
      payload: response.variantsToRemove,
    });
    dispatch({
      type: "ADD_VARIANT_OPTION_TO_ADD",
      payload: response.variantOptionsToAdd,
    });
    dispatch({
      type: "ADD_VARIANT_NAMES_TO_ADD",
      payload: response.variantNamesToAdd,
    });
    dispatch({
      type: "ADD_INVALID_VARIANTS",
      payload: response.invalidVariants,
    });
  }, []);

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
      <Form method="post" ref={formRef}>
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
                formRef.current?.submit();
                handleChange();
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
