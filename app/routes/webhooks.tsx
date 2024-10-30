import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { graphqlClient } from "./app";
import { gql } from "graphql-request";
import { Session } from "@shopify/shopify-api";
import { Shopify, ShopifyHeader } from "@shopify/shopify-api";
import { role_type } from "@prisma/client";
import CryptoJS from "crypto-js";
import { logWebhookPayload } from "./webhooks.log";
import { log } from "console";

export const action = async ({ request }: ActionFunctionArgs) => {
  // Capture raw body from request
  const reqClone = request.clone();
  const rawPayload = await reqClone.text();

  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

  console.log("Received webhook :::!");

  const signature = request.headers.get("x-shopify-hmac-sha256");

  console.log("Signature :::!", signature);

  const secretKey = process.env.SHOPIFY_API_SECRET;

  // Generate the HMAC signature using crypto-js
  const generatedSignature = CryptoJS.HmacSHA256(
    rawPayload,
    secretKey,
  ).toString(CryptoJS.enc.Base64);

  console.log("Generated Signature :::!", generatedSignature);

  // const generatedSignature = crypto
  //   .createHmac("SHA256", secretKey)
  //   .update(requestBodyString, "utf8")
  //   .digest("base64");

  if (signature !== generatedSignature) {
    console.log("Invalid signature :::!");
    return new Response("Invalid signature", { status: 401 });
  }

  console.log("Signature verified :::!");

  switch (topic) {
    case "APP_UNINSTALLED":
      {
        const query = `
      mutation r{
        removeShopSubscription(shop: "${shop}")
        }`;

        if (session) {
          const response = await graphqlClient.request<{ success: boolean }>(
            query,
          );

          console.log(response.success);
        }
      }
      break;
    case "ORDERS_CREATE":
      {
        console.log(`------- HIT ORDER CREATE HERE -------`);
        // logWebhookPayload("ORDERS_CREATE", payload);
        console.log(`------- HIT ENDED ORDER CREATE -------`);
      }
      break;

    case "PRODUCTS_UPDATE":
      {
        console.log(`------- HIT PRODUCT UPDATE HERE -------`);
        // logWebhookPayload("PRODUCTS_UPDATE", payload);
        console.log(`------- HIT ENDED PRODUCT UPDATE -------`);
      }
      break;
    case "PRODUCTS_CREATE":
      {
        console.log(`------- HIT PRODUCT UPDATE HERE -------`);
        // logWebhookPayload("PRODUCTS_CREATE", payload);
        console.log(`------- HIT ENDED PRODUCT UPDATE -------`);
      }
      break;
    case "PRODUCTS_DELETE":
      {
        console.log(`------- HIT PRODUCT UPDATE HERE -------`);
        // logWebhookPayload("PRODUCTS_DELETE", payload);
        console.log(`------- HIT ENDED PRODUCT UPDATE -------`);
      }
      break;
    case "CUSTOMERS_DATA_REQUEST":
      break;

    case "CUSTOMERS_REDACT":
      break;

    case "SHOP_REDACT":
      break;

    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
