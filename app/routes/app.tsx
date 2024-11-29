import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import "@shopify/polaris/build/esm/styles.css";

import { authenticate } from "../shopify.server";

import { GraphQLClient } from "graphql-request";
import { ShopContextProvider } from "~/session/shop-session-provider";
import ProductsProvider from "~/context/productsContext";
import { OrderProvider } from "~/context/orderContext";
import { ShopSessionContext } from "~/session/shop-session";
import { useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  console.log("REACHED HERE 53", process.env.SHOPIFY_API_KEY);

  // console.log("DEVMODE", devMode);
  // console.log("ENV", process.env.DEV_MODE);

  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

let devMode: boolean = true;
try {
  devMode = process.env.REACT_APP_DEV_MODE === "true";
  console.log("DEVMODE", devMode);
} catch (e) {
  console.log(e);
}

const endpoint = devMode
  ? `http://localhost:3001/graphql`
  : "https://greenlineco.site/graphql";
export const graphqlClient = new GraphQLClient(endpoint, {
  headers: {
    "Content-Type": "application/json",
  },
});

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <ShopContextProvider>
        <ProductsProvider>
          <OrderProvider>
            <ui-nav-menu>
              <Link to="/app" rel="home">
                Home
              </Link>
              <Link to="/app/products">Products</Link>
              <Link to="/app/orders">Orders</Link>
            </ui-nav-menu>
            <Outlet />
          </OrderProvider>
        </ProductsProvider>
      </ShopContextProvider>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
