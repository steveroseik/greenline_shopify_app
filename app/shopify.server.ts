import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-07";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.July24,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma, {
    tableName: "shopify_session",
  }),
  distribution: AppDistribution.AppStore,
  restResources,
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
    ORDERS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
      callback: async (topic, shop, body, webhookId) => {
        console.log(`------- ORDER CREATED ---------`);
        console.log(body);
        console.log(`------- ORDER ENDED ---------`);
      },
    },
    PRODUCTS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
      callback: async (topic, shop, body, webhookId) => {
        console.log(`------- PRODUCT UPDATED ---------`);
        console.log(body);
        console.log(`------- PRODUCT ENDED ---------`);
      },
    },
    CUSTOMERS_DATA_REQUEST: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
      callback: async (topic, shop, body, webhookId) => {
        console.log(`------- CUSTOMER DATA REQUESTED ---------`);
        console.log(body);
        console.log(`------- CUSTOMER DATA REQUESTED ---------`);
      },
    },
    CUSTOMERS_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
      callback: async (topic, shop, body, webhookId) => {
        console.log(`------- CUSTOMER DATA REDACTED ---------`);
        console.log(body);
        console.log(`------- CUSTOMER DATA REDACTED ---------`);
      },
    },
    SHOP_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
      callback: async (topic, shop, body, webhookId) => {
        console.log(`------- SHOP REDACTED ---------`);
        console.log(body);
        console.log(`------- SHOP REDACTED ---------`);
      },
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      shopify.registerWebhooks({ session });
      console.log(
        "REGISTERED WEBHOOKS !  ! ! ! ! !  ! ! ! ! ! ! !  ! ! ! ! ! !  ! !  !",
      );
    },
  },
});

export default shopify;
export const apiVersion = ApiVersion.July24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
