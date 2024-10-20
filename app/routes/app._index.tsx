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
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { AdminApiContext, Session } from "@shopify/shopify-app-remix/server";
import { ShopSession, useShopSession } from "~/session/shop-session";
import { graphqlClient } from "./app";
import { gql } from "graphql-request";
import { validateEmail } from "~/support/emailValidations";
import { FindShopResponse } from "~/interface/Shop/find-shop";
import { LoaderResponse } from "~/interface/Shop/loader-response";
import { SignInFromShopifyResponse } from "~/interface/Shop/signin-from-shopify";

export const loader: LoaderFunction = async ({
  request,
}: LoaderFunctionArgs): Promise<LoaderResponse> => {
  const { session, admin } = await authenticate.admin(request);

  const { shop, accessToken } = session;

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

  console.log("ACTIOED", action);

  switch (action) {
    case "signIn":
      return signInActionFunction(formData, shop);
    case "linkShop":
      return linkShopActionFunction(shop, formData, session, admin);
    default:
      return null;
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

export default function Index() {
  const nav = useNavigation();
  const actionData = useActionData<typeof action>();
  const loaderData = useLoaderData<LoaderResponse>();

  const { shopSession, updateState, resetSession } = useShopSession();

  let actionMessage = actionData?.message;

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (loading) setLoading(false);
    console.log("DATA YABA", actionData);
    console.log("LOADER YABA", loaderData);

    // Show action message toast if available
    const actionMessage = actionData?.message;
    if (actionMessage) {
      shopify.toast.show(`${actionMessage}`);
    }

    // Update shop session with loader data
    if (loaderData) {
      if (actionData?.merchant) loaderData.merchant = actionData.merchant;
      if (actionData?.shop) loaderData.shop = actionData.shop;
      console.log();
      updateState({
        merchantInfo: loaderData?.merchant,
        shop: loaderData?.shop,
        linked: loaderData?.success ?? false,
        fetched: true,
      });

      console.log("LOADER DATA", loaderData);
    }

    // Update shop session with action data if necessary
    if (actionData?.merchant && !shopSession.merchantInfo) {
      updateState({
        merchantInfo: {
          id: actionData?.merchant!.id,
          name: actionData?.merchant!.name,
        },
      });
    }

    if (actionData?.linked === true && shopSession.linked !== true) {
      updateState({
        linked: true,
      });
    }
  }, [loaderData, actionData]);

  const submit = useSubmit();

  const isLoading = ["loading", "submitting"].includes(nav.state);

  // useEffect(() => {
  //   if (productId) {
  //     shopify.toast.show("Product created");
  //   }
  // }, [productId]);

  // const generateProduct = () => submit({}, { replace: true, method: "POST" });

  const [email, setEmail] = useState("");

  const handleEmail = useCallback((newValue: string) => setEmail(newValue), []);

  const [password, setPass] = useState("");

  const handlePass = useCallback((newValue: string) => setPass(newValue), []);

  return (
    <Page>
      <Layout.Section>
        <ui-title-bar title="Greenline Co."></ui-title-bar>
      </Layout.Section>
      <ui-title-bar title="Greenline Co."></ui-title-bar>
      <BlockStack gap="500">
        <Layout>
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
                      <Form
                        method="post"
                        onSubmit={() =>
                          submit({}, { replace: true, method: "POST" })
                        }
                      >
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
                        <input type="hidden" name="action" value="signIn" />
                        <Button variant="primary" submit={true}>
                          Connect with App
                        </Button>
                      </Form>
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
                        <Form
                          method="POST"
                          onSubmit={() =>
                            submit({}, { replace: true, method: "POST" })
                          }
                        >
                          <input type="hidden" name="action" value="linkShop" />
                          <input
                            type="hidden"
                            name="merchantId"
                            value={shopSession.merchantInfo?.id}
                          />
                          <Button variant="primary" submit={true}>
                            Link With {shopSession.merchantInfo.name}
                          </Button>
                        </Form>
                        <Form
                          method="POST"
                          onSubmit={(e) => {
                            e.preventDefault(); // Prevent the default form submission
                            resetSession(); // Call resetSession
                          }}
                        >
                          <Button
                            variant="primary"
                            tone="critical"
                            submit={true}
                          >
                            Switch Account
                          </Button>
                        </Form>
                      </div>
                    </Card>
                  </Layout.Section>
                )}
              {shopSession.linked === true && (
                <Layout.Section>
                  <Card>
                    <Text variant="bodyLg" as="h3">
                      CONGRATULATIONSS YOU ARE LINKED
                    </Text>
                  </Card>
                </Layout.Section>
              )}
            </>
          )}
        </Layout>
      </BlockStack>
    </Page>
  );
}
