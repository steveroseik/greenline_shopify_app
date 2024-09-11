import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { graphqlClient } from "./app";
import { gql } from "graphql-request";
import { Session } from "@shopify/shopify-api";
import { Shopify, ShopifyHeader } from "@shopify/shopify-api";
import { role_type } from "@prisma/client";
import CryptoJS from "crypto-js";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

  const signature = request.headers.get("x-shopify-hmac-sha256");
  const requestBodyString = JSON.stringify(request.body);

  const secretKey = process.env.SHOPIFY_API_SECRET;

  // Generate the HMAC signature using crypto-js
  const generatedSignature = CryptoJS.HmacSHA256(
    requestBodyString,
    secretKey,
  ).toString(CryptoJS.enc.Base64);

  if (signature !== generatedSignature) {
    return new Response("Invalid signature", { status: 401 });
  }

  console.log(request.headers.get("X-Shopify-Topic"));
  if (!admin) {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    throw new Response();
  }

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
      return { status: 200 };

    case "ORDERS_CREATE":
      {
        console.log(`------- HIT ORDER CREATE HERE -------`);
        console.log(payload);
        const resp = await prisma.role.create({
          data: {
            name: "SST",
            type: role_type.Merchant,
            description: "TESTING",
          },
        });
        console.log(resp.createdAt, "CREATED AT");
        console.log(`------- HIT ENDED ORDER CREATE -------`);
      }
      return { status: 200 };

    case "PRODUCTS_UPDATE":
      {
        console.log(`------- HIT PRODUCT UPDATE HERE -------`);
        console.log(payload);
        console.log(`------- HIT ENDED PRODUCT UPDATE -------`);
      }
      return { status: 200 };

    case "CUSTOMERS_DATA_REQUEST":
      return { status: 200 };

    case "CUSTOMERS_REDACT":
      return { status: 200 };

    case "SHOP_REDACT":
      return { status: 200 };

    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
