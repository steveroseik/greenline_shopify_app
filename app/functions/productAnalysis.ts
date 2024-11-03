import { findItemsWithShopifyIdResponse } from "~/interface/Product/find-items-with-shopify-id";
import { Item, ItemVariant } from "~/interface/Product/itemObject.interface";
import {
  VariantsNode,
  EdgeNode,
  Edge,
  ProductsPage,
} from "~/interface/Product/productsPageInterface";
import { graphqlClient } from "~/routes/app";
import { gql } from "graphql-request";
import Decimal from "decimal.js";

// Helper function to check if variant has an image or if product has a fallback image
function checkVariantImage(
  variant: VariantsNode,
  product: EdgeNode,
  invalidVariants: VariantsNode[],
): boolean {
  if (!variant.image) {
    if (product.images.nodes.length > 0) {
      const fallbackImage = product.images.nodes.find((img) => img.url);
      if (fallbackImage) {
        variant.image = fallbackImage;
        return true;
      }
    }
    variant.invalid = true;
    invalidVariants.push(variant);
    return false;
  }
  return true;
}

// Helper function to add variant options and names to the tracking lists
function addVariantOptions(
  variant: VariantsNode,
  variantOptionsToAdd: string[],
  variantNamesToAdd: string[],
): void {
  if (variant.selectedOptions) {
    variant.selectedOptions.forEach((option) => {
      option.name = option.name === "Title" ? "Default" : option.name;
      option.value =
        option.value === "Default Title" ? "Default" : option.value;

      if (!variantOptionsToAdd.includes(option.value)) {
        variantOptionsToAdd.push(option.value);
      }
      if (!variantNamesToAdd.includes(option.name)) {
        variantNamesToAdd.push(option.name);
      }
    });
  }
}

// Process products that do not exist in the database and prepare them to be added
function processNewProducts(
  productsEdges: Edge[],
  itemsToAdd: EdgeNode[],
  variantOptionsToAdd: string[],
  variantNamesToAdd: string[],
  invalidVariants: VariantsNode[],
): void {
  productsEdges.forEach((edge) => {
    edge.node.variants.nodes.forEach((variant) => {
      variant.synced = false;
      variant.invalid = false;

      if (checkVariantImage(variant, edge.node, invalidVariants)) {
        addVariantOptions(variant, variantOptionsToAdd, variantNamesToAdd);
      }
    });

    const validVariants = edge.node.variants.nodes.filter(
      (variant) => !variant.invalid,
    );
    if (validVariants.length > 0) {
      itemsToAdd.push(edge.node); // Add product to add list if it has valid variants
    }
  });
}

// Process products that exist in the database, validating each product and its variants
function processExistingProducts(
  products: Edge[],
  dbItems: findItemsWithShopifyIdResponse,
  goodItems: EdgeNode[],
  itemsToAdd: EdgeNode[] = [],
  itemsToUpdate: EdgeNode[],
  itemsToRemove: Item[],
  variantsToAdd: VariantsNode[],
  variantsToUpdate: VariantsNode[],
  variantsToRemove: ItemVariant[],
  variantOptionsToAdd: string[],
  variantNamesToAdd: string[],
  invalidVariants: VariantsNode[],
): void {
  products.forEach((edge) => {
    const dbItem = dbItems.findItemsWithShopifyId?.find(
      (db) => db.shopifyId === edge.node.id,
    );
    if (dbItem) {
      // Compare the existing database item with the Shopify item

      validateAndSyncProduct(
        edge,
        dbItem,
        goodItems,
        itemsToUpdate,
        variantsToAdd,
        variantsToUpdate,
        variantsToRemove,
        variantOptionsToAdd,
        variantNamesToAdd,
        invalidVariants,
      );
    } else {
      // No matching database item found, treat as new

      processNewProducts(
        [edge],
        itemsToAdd,
        variantOptionsToAdd,
        variantNamesToAdd,
        invalidVariants,
      );
    }
  });

  // Identify items and variants to remove
  identifyItemsToRemove(products, dbItems, itemsToRemove, variantsToRemove);
}

// Validate a product and its variants, comparing with the database item
function validateAndSyncProduct(
  edge: Edge,
  dbItem: Item,
  goodItems: EdgeNode[],
  itemsToUpdate: EdgeNode[],
  variantsToAdd: VariantsNode[],
  variantsToUpdate: VariantsNode[],
  variantsToRemove: ItemVariant[],
  variantOptionsToAdd: string[],
  variantNamesToAdd: string[],
  invalidVariants: VariantsNode[],
): void {
  if (
    dbItem.description ===
      edge.node.description.substring(
        0,
        Math.min(700, edge.node.description.length),
      ) &&
    dbItem.name === (edge.node.title == "Default Title" ? "" : edge.node.title)
  ) {
    goodItems.push(edge.node); // Product is up-to-date
  } else {
    itemsToUpdate.push(edge.node); // Product needs to be updated
  }

  // Validate each product variant

  edge.node.variants.nodes.forEach((variant) => {
    const dbVariant = dbItem.itemVariants.find(
      (v) => v.shopifyId === variant.id,
    );

    if (dbVariant) {
      validateAndSyncVariant(
        variant,
        dbVariant,
        edge,
        variantsToUpdate,
        variantsToRemove,
        variantOptionsToAdd,
        variantNamesToAdd,
        invalidVariants,
      );
    } else {
      // New variant not in the database
      variant.itemName = edge.node.title;
      variant.itemId = dbItem.id;
      checkVariantImage(variant, edge.node, invalidVariants);
      addVariantOptions(variant, variantOptionsToAdd, variantNamesToAdd);
      variantsToAdd.push(variant);
    }
  });
}

// Validate and sync an individual variant
function validateAndSyncVariant(
  variant: VariantsNode,
  dbVariant: ItemVariant,
  edge: Edge,
  variantsToUpdate: VariantsNode[],
  variantsToRemove: ItemVariant[],
  variantOptionsToAdd: string[],
  variantNamesToAdd: string[],
  invalidVariants: VariantsNode[],
): void {
  if (!checkVariantImage(variant, edge.node, invalidVariants)) {
    variantsToRemove.push(dbVariant); // Variant is invalid and should be removed
  } else {
    addVariantOptions(variant, variantOptionsToAdd, variantNamesToAdd);

    // Compare other variant properties (price, SKU, availability, etc.)
    if (
      (dbVariant.merchantSku !== variant.sku && variant.sku) ||
      new Decimal(dbVariant.price).toFixed(2) !== variant.price ||
      dbVariant.imageUrl !== variant.image?.url ||
      (dbVariant.name ?? "") !==
        (variant.title === "Default Title" ? "" : variant.title) ||
      dbVariant.isEnabled !== variant.availableForSale
    ) {
      variant.synced = false; // Variant needs to be updated
      variantsToUpdate.push(variant); // Variant needs to be updated
    } else {
      variant.synced = true; // Variant is up-to-date
    }
  }
}

// Identify items and variants to remove (based on Shopify data and existing database records)
function identifyItemsToRemove(
  products: Edge[],
  dbItems: findItemsWithShopifyIdResponse,
  itemsToRemove: Item[],
  variantsToRemove: ItemVariant[],
): void {
  for (let dbItem of dbItems.findItemsWithShopifyId) {
    const product = products.find((edge) => edge.node.id === dbItem.shopifyId);

    if (!product) {
      itemsToRemove.push(dbItem);
    } else {
      const flatShopifyVariants = product.node.variants.nodes;
      const itemVariantsNotInShopify = dbItem.itemVariants.filter(
        (itemVariant) =>
          !flatShopifyVariants.some(
            (variant) => variant.id === itemVariant.shopifyId,
          ),
      );
      variantsToRemove.push(...itemVariantsNotInShopify);
    }
  }
}

// Main function to analyze products and sync with Shopify
export async function analyseProducts(products: Edge[]): Promise<{
  products: Edge[];
  goodItems: EdgeNode[];
  itemsToAdd: EdgeNode[];
  itemsToUpdate: EdgeNode[];
  itemsToRemove: Item[];
  variantsToAdd: VariantsNode[];
  variantsToUpdate: VariantsNode[];
  variantsToRemove: ItemVariant[];
  variantOptionsToAdd: string[];
  variantNamesToAdd: string[];
  invalidVariants: VariantsNode[];
}> {
  let goodItems: EdgeNode[] = [];
  let itemsToAdd: EdgeNode[] = [];
  let itemsToUpdate: EdgeNode[] = [];
  let itemsToRemove: Item[] = [];
  let variantsToAdd: VariantsNode[] = [];
  let variantsToUpdate: VariantsNode[] = [];
  let variantsToRemove: ItemVariant[] = [];
  let variantOptionsToAdd: string[] = [];
  let variantNamesToAdd: string[] = [];
  let invalidVariants: VariantsNode[] = [];

  const productIds = products.map((edge) => edge.node.id);

  const dbItems =
    await graphqlClient.request<findItemsWithShopifyIdResponse | null>(
      `
        query ($input: FindItemsWithShopifyIdInput!) {
          findItemsWithShopifyId(input: $input) {
            id
            merchantId
            shopifyId
            name
            currency
            imageUrl
            description
            itemVariants {
              id
              itemId
              shopifyId
              name
              price
              merchantSku
              imageUrl
              isEnabled
              selectedOptions {
                id
                variantOption {
                  id
                  value
                }
                variantName {
                  id
                  name
                }
              }
            }
          }
        }
      `,
      { input: { ids: productIds } },
    );

  if (
    !dbItems?.findItemsWithShopifyId ||
    dbItems.findItemsWithShopifyId.length === 0
  ) {
    // Handle new products that don't exist in the database

    processNewProducts(
      products,
      itemsToAdd,
      variantOptionsToAdd,
      variantNamesToAdd,
      invalidVariants,
    );
  } else {
    // Handle existing products and their variants
    processExistingProducts(
      products,
      dbItems,
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

  return {
    products,
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
  };
}
