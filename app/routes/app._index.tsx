import { useCallback, useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  LoaderFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  TextField,
  Spinner,
  Grid,
  InlineGrid,
  Select,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { AdminApiContext, Session } from "@shopify/shopify-app-remix/server";
import { ShopSession, useShopSession } from "~/session/shop-session";
import { graphqlClient } from "./app";
import { gql } from "graphql-request";
import { validateEmail } from "~/support/emailValidations";
import { FindShopResponse } from "~/interface/Shop/find-shop";
import { LoaderResponse } from "~/interface/Shop/loader-response";
import { SignInFromShopifyResponse } from "~/interface/Shop/signin-from-shopify";
import {
  CheckCircleIcon,
  CheckIcon,
  EditIcon,
  PlusIcon,
  SaveIcon,
} from "@shopify/polaris-icons";
import { Redirect } from "@shopify/app-bridge/actions";
import { createApp } from "@shopify/app-bridge/client";
import { Row } from "@shopify/polaris/build/ts/src/components/IndexTable";
import FulfillmentSettings from "~/components/fulfilmentOptions";
import { updateFulfillmentSettingsQuery } from "~/queries/updateFulfillmentSettings";
import { select, update } from "@shopify/app-bridge/actions/ResourcePicker";
import { logWebhookPayload } from "./webhooks.log";

export const loader: LoaderFunction = async ({
  request,
}: LoaderFunctionArgs): Promise<LoaderResponse> => {
  const { session, admin } = await authenticate.admin(request);

  const { shop, accessToken } = session;

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

  console.log(response, "RESPONSE");

  // const webhooks = await admin.rest.resources.Webhook.all({
  //   session,
  //   limit: 20,
  // });

  // console.log(webhooks.data, "WEBHOOKS");

  if (response.findShop !== null) {
    return {
      success: true,
      shop,
      merchant: response.findShop,
    };
  } else {
    return {
      success: false,
      shop,
      message: "Failed",
    };
  }
};

export const action = async ({ request }: ActionFunctionArgs): Promise<any> => {
  const { session, admin } = await authenticate.admin(request);

  const { shop, accessToken } = session;

  const formData = await request.formData();

  const action = formData.get("action");

  // const destination = formData.get("destination").toString();

  console.log("ACTIOED", action);

  try {
    switch (action) {
      case "signIn":
        return signInActionFunction(formData, shop);
      case "linkShop":
        return linkShopActionFunction(shop, formData, session, admin);
      case "updateFulfillment":
        return updateFulfillmentActionFunction(formData);
      case "navigate": {
        // if (destination?.length > 0) {
        //   const redirect = Redirect.create(bridgeApp);
        //   redirect.dispatch(Redirect.Action.APP, destination);
        //   return true;
        // }
        // return false;
      }

      default:
        return null;
    }
  } catch (e) {
    console.log("FAILED ACTIONNNN GEN");
    return {
      success: false,
      message: "Internal Error",
    };
  }
};

const updateFulfillmentActionFunction = async (formData: FormData) => {
  const merchantId = formData.get("merchantId");

  try {
    if (merchantId == null)
      return {
        type: "updateFulfillment",
        success: false,
        message: "No Merchant Id Found!",
      };

    const selectedOption = formData.get("selectedOption");

    const response = await graphqlClient.request<{
      success: boolean;
      message?: string;
    }>(
      gql`
        ${updateFulfillmentSettingsQuery()}
      `,
      {
        input: {
          id: parseInt(merchantId.toString()),
          shopifyFulfillmentType: selectedOption,
        },
      },
    );

    console.log(response, "RESPONSEX");

    return {
      type: "updateFulfillment",
      ...response,
    };
  } catch (e) {
    console.log(e);
    console.log("FAILED updateFulfillmentSettingsQuery");

    logWebhookPayload("Fulfillment Settings Updated", { data: e });
    return {
      type: "updateFulfillment",
      success: false,
      message: "Internal Error",
    };
  }
};

const linkShopActionFunction = async (
  shop: string,
  formData: FormData,
  session: Session,
  admin: AdminApiContext,
) => {
  const merchantId = formData.get("merchantId");

  if (merchantId == null)
    return {
      success: false,
      message: "No Merchant Id Found!",
    };
  const query = `
    mutation{
      linkShopToMerchant(input: { 
        shop: "${shop}", merchantId: ${Number.parseInt(merchantId.toString())} })
    }
  `;

  const response = await graphqlClient.request<{
    success: boolean;
    message?: string;
  }>(gql`
    ${query}
  `);

  console.log(response, "RESPONSEX");

  return {
    ...response,
    linked: response.success,
  };
};

const signInActionFunction = async (formData: FormData, shop: String) => {
  const email = formData.get("email");
  const password = formData.get("password");

  console.log("EMAIL", email);
  console.log("PASSWORD", password);

  if (!validateEmail(email?.toString())) {
    return {
      success: false,
      message: "Invalid Email",
    };
  }

  if ((password?.toString().length ?? 0) < 6) {
    return {
      success: false,
      message: "Invalid Password Length",
    };
  }

  const query = `mutation {
  signInFromShopify(input: {
    email:"${email}",
    password:"${password}",
    shopifyId: "${shop}"
  })
}`;

  try {
    const response =
      await graphqlClient.request<SignInFromShopifyResponse | null>(gql`
        ${query}
      `);

    console.log(response, "RESPONSE");

    if (response === null)
      return {
        success: false,
        message: "No Response, Check Your Internet Connection",
      };

    if (response.signInFromShopify.success) {
      return {
        success: true,
        merchant: response.signInFromShopify.merchantDetails,
      };
    } else {
      return {
        success: false,
        message: response.signInFromShopify?.message ?? "Failed to get message",
      };
    }
  } catch (e) {
    console.log(e);
    return {
      success: false,
      message: `${e}`,
    };
  }
};

const fulfillmentOptions = new Map<String, String>([
  ["automatic", "Automatic Fulfillment"],
  ["afterAssignment", "Fulfillment After Courier Assignment"],
]);

export default function Index() {
  const nav = useNavigation();
  const actionData = useActionData<typeof action>();

  const loaderData = useLoaderData<LoaderResponse>();

  const { shopSession, updateState, resetSession } = useShopSession();

  const fetcher = useFetcher<any>();

  const [loading, setLoading] = useState<boolean>(true);

  const isLoading = ["loading", "submitting"].includes(nav.state);

  // useEffect(() => {
  //   if (productId) {
  //     shopify.toast.show("Product created");
  //   }
  // }, [productId]);

  // const generateProduct = () => submit({}, { replace: true, method: "POST" });

  const [isUpdatingSettings, setUpdatingSettings] = useState(false);

  const [email, setEmail] = useState("");

  const handleEmail = useCallback((newValue: string) => setEmail(newValue), []);

  const [password, setPass] = useState("");

  const handlePass = useCallback((newValue: string) => setPass(newValue), []);

  const [selected, setSelected] = useState(null);

  const [isEditing, setEditing] = useState(false);

  const toggleEditing = useCallback(
    () => setEditing((editing) => !editing),
    [],
  );

  useEffect(() => {
    if (loading) setLoading(false);

    console.log("ACTION DATA", fetcher.data);

    // Show action message toast if available
    const actionMessage = fetcher.data?.message;
    if (actionMessage) {
      shopify.toast.show(`${actionMessage}`);
    }

    // Update shop session with loader data
    if (loaderData) {
      if (fetcher.data?.merchant) loaderData.merchant = fetcher.data.merchant;
      if (fetcher.data?.shop) loaderData.shop = fetcher.data.shop;

      updateState({
        merchantInfo: loaderData?.merchant,
        shop: loaderData?.shop,
        linked: loaderData?.success ?? false,
        fetched: true,
      });
    }

    if (fetcher.data?.type == "updateFulfillment") {
      if (fetcher.data.updateShopifyFulfillmentSettings?.success) {
        updateState({
          merchantInfo: {
            ...shopSession.merchantInfo,
            settings: {
              ...shopSession.merchantInfo?.settings,
              shopifyFulfillmentType: fetcher.data.selectedOption,
            },
          },
        });
        setEditing(false);
      }
      setUpdatingSettings(false);

      console.log("setted", isUpdatingSettings);
    }

    // Update shop session with action data if necessary
    if (fetcher.data?.merchant && !shopSession.merchantInfo) {
      updateState({
        merchantInfo: {
          id: fetcher.data?.merchant!.id,
          name: fetcher.data?.merchant!.name,
          settings: fetcher.data?.merchant!.settings,
        },
      });
    }

    if (fetcher.data?.linked === true && shopSession.linked !== true) {
      updateState({
        linked: true,
      });
    }

    if (!isEditing) {
      setSelected(shopSession.merchantInfo?.settings.shopifyFulfillmentType);
    }
  }, [fetcher.data, isLoading, isEditing, isUpdatingSettings]);

  const handleFulfillmentUpdate = async () => {
    if (isEditing) {
      fetcher.submit(
        {
          action: "updateFulfillment",
          merchantId: shopSession.merchantInfo?.id,
          selectedOption: selected,
        },
        { method: "POST" },
      );
      setUpdatingSettings(true);
    } else {
      toggleEditing();
    }
  };

  return (
    <Page>
      <Layout.Section>
        <ui-title-bar title="Greenline Co."></ui-title-bar>
      </Layout.Section>
      <ui-title-bar title="Greenline Co."></ui-title-bar>
      <Layout>
        {!shopSession.linked && (
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Welcome to Greenline Shopify App 🎉
                  </Text>
                  <Text variant="bodyMd" as="p">
                    We're excited to have you here! This app is designed to
                    enhance your Shopify experience.
                  </Text>
                  <Text variant="bodyMd" as="p">
                    To get started, please connect by logging in with your
                    Greenline Admin account.
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
        {loading ? (
          <Layout.Section>
            <Card>
              <Spinner aria-label="Loading orders" />
            </Card>
          </Layout.Section>
        ) : (
          <>
            {shopSession.linked !== true &&
              shopSession.merchantInfo?.id === undefined && (
                <Layout.Section>
                  <Card>
                    <Card>
                      <TextField
                        inputMode="email"
                        label="Email"
                        name="email"
                        value={email}
                        onChange={handleEmail}
                        placeholder="Ex: steveroseik@gmail.com"
                        autoComplete="true"
                      />
                      <div style={{ padding: "5px" }} />
                      <TextField
                        inputMode="text"
                        name="password"
                        type="password"
                        value={password}
                        onChange={handlePass}
                        label="Password"
                        autoComplete="true"
                      />
                    </Card>
                    <div style={{ padding: "10px" }} />
                    <Button
                      variant="primary"
                      onClick={() =>
                        fetcher.submit(
                          {
                            action: "signIn",
                            email,
                            password,
                          },
                          { method: "POST" },
                        )
                      }
                    >
                      Connect with App
                    </Button>
                  </Card>
                </Layout.Section>
              )}
            {shopSession.linked !== true &&
              shopSession.merchantInfo?.id !== undefined &&
              shopSession.merchantInfo?.name !== undefined && (
                <Layout.Section>
                  <Card>
                    <Text variant="headingSm" as="h3">
                      You are a manager in {shopSession.merchantInfo.name} at
                      Greenline. Do you want to link it?
                    </Text>
                    <div style={{ padding: "10px" }} />
                    <div style={{ display: "flex", gap: "10px" }}>
                      <Button
                        variant="primary"
                        onClick={() =>
                          fetcher.submit(
                            {
                              action: "linkShop",
                              merchantId: shopSession.merchantInfo?.id,
                            },
                            { method: "POST" },
                          )
                        }
                      >
                        Link With {shopSession.merchantInfo.name}
                      </Button>
                      <Form
                        method="POST"
                        onSubmit={(e) => {
                          e.preventDefault(); // Prevent the default form submission
                          resetSession(); // Call resetSession
                        }}
                      >
                        <Button variant="primary" tone="critical" submit={true}>
                          Switch Account
                        </Button>
                      </Form>
                    </div>
                  </Card>
                </Layout.Section>
              )}
            {shopSession.linked === true && (
              <Layout.Section>
                <InlineGrid columns={2}>
                  <div style={{ height: "auto", width: "100%" }}>
                    <Layout.Section>
                      <Card>
                        <Text as="h2" variant="headingMd">
                          Welcome Back, {shopSession.merchantInfo?.name}!
                        </Text>
                      </Card>
                    </Layout.Section>
                  </div>
                  <Layout.Section>
                    <Card>
                      <InlineGrid columns="1fr auto">
                        <Text as="h2" variant="headingSm">
                          Settings
                        </Text>

                        <InlineStack>
                          {!isUpdatingSettings ? (
                            <>
                              {isEditing && (
                                <>
                                  <Button
                                    tone="critical"
                                    onClick={() => {
                                      toggleEditing();
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <div style={{ padding: "5px" }}></div>
                                </>
                              )}
                              <Button
                                onClick={() => handleFulfillmentUpdate()}
                                accessibilityLabel="Add variant"
                                icon={isEditing ? CheckIcon : EditIcon}
                              >
                                {isEditing ? "Done" : "Edit"}
                              </Button>
                            </>
                          ) : (
                            <Spinner size="small" />
                          )}
                        </InlineStack>
                      </InlineGrid>
                      <Text as="h2" variant="headingSm">
                        Order Fulfillment
                      </Text>
                      <div style={{ padding: "5px" }}></div>
                      <>
                        {isEditing ? (
                          <FulfillmentSettings
                            defaultSelection={
                              shopSession.merchantInfo?.settings
                                .shopifyFulfillmentType
                            }
                            onSelectionChange={(value) => {
                              setSelected(value);
                            }}
                          />
                        ) : (
                          <Text as="p">{selected ?? "No Shopify Update"}</Text>
                        )}
                      </>
                    </Card>
                  </Layout.Section>
                </InlineGrid>
              </Layout.Section>
            )}
          </>
        )}
      </Layout>
    </Page>
  );
}
