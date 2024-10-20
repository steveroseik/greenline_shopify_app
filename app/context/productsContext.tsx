import { stat } from "fs";
import { s } from "node_modules/vite/dist/node/types.d-aGj9QkWt";
import React, {
  Component,
  PropsWithChildren,
  Reducer,
  createContext,
  useReducer,
  useState,
} from "react";
import { Item, ItemVariant } from "~/interface/Product/itemObject.interface";
import {
  Edge,
  EdgeNode,
  VariantsNode,
} from "~/interface/Product/productsPageInterface";

export interface productContextData {
  data: Edge[];
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
  syncing: boolean;
  lastSyncedIndex?: number;
  lastFetched?: Date;
}

export const ProductsContext = createContext<{
  state: productContextData;
  dispatch: Function;
}>({
  state: {
    data: [],
    itemsToAdd: [],
    itemsToUpdate: [],
    goodItems: [],
    itemsToRemove: [],
    variantsToAdd: [],
    variantsToUpdate: [],
    variantsToRemove: [],
    variantOptionsToAdd: [],
    variantNamesToAdd: [],
    invalidVariants: [],
    syncing: false,
    lastFetched: undefined,
    lastSyncedIndex: undefined,
  },
  dispatch: () => {},
});

const productsReducer = (state: productContextData, action: any) => {
  switch (action.type) {
    case "START_SYNC":
      return {
        ...state,
        syncing: true,
        lastSyncedIndex: 0,
      };
    case "CONTINUE_SYNC":
      return {
        ...state,
        syncing: true,
        lastSyncedIndex: action.payload.endIndex,
      };
    case "END_SYNC":
      return {
        ...state,
        syncing: false,
        lastSyncedIndex: undefined,
      };
    case "ADD_ITEMS_TO_ADD":
      return {
        ...state,
        itemsToAdd: [
          ...state.itemsToAdd,
          ...action.payload.filter(
            (e) => !state.itemsToAdd.find((i) => i.id == e.id),
          ),
        ],
      };
    case "ADD_ITEMS_TO_UPDATE":
      return {
        ...state,
        itemsToUpdate: [
          ...state.itemsToUpdate,
          ...action.payload.filter((e) => !state.itemsToUpdate.includes(e)),
        ],
      };
    case "ADD_GOOD_ITEMS":
      return {
        ...state,
        goodItems: [
          ...state.goodItems,
          ...action.payload.filter(
            (e) => !state.goodItems.find((i) => i.id == e.id),
          ),
        ],
      };
    case "ADD_ITEMS_TO_REMOVE":
      return {
        ...state,
        itemsToRemove: [
          ...state.itemsToRemove,
          ...action.payload.filter(
            (e) => !state.itemsToRemove.find((i) => i.id == e.id),
          ),
        ],
      };
    case "ADD_VARIANTS_TO_ADD":
      return {
        ...state,
        variantsToAdd: [
          ...state.variantsToAdd,
          ...action.payload.filter(
            (e) => !state.variantsToAdd.find((i) => i.id == e.id),
          ),
        ],
      };
    case "ADD_VARIANTS_TO_UPDATE":
      return {
        ...state,
        variantsToUpdate: [
          ...state.variantsToUpdate,
          ...action.payload.filter(
            (e) => !state.variantsToUpdate.find((i) => i.id == e.id),
          ),
        ],
      };
    case "ADD_VARIANTS_TO_REMOVE":
      return {
        ...state,
        variantsToRemove: [
          ...state.variantsToRemove,
          ...action.payload.filter(
            (e) => !state.variantsToRemove.find((i) => i.id == e.id),
          ),
        ],
      };
    case "ADD_VARIANT_OPTION_TO_ADD":
      return {
        ...state,
        variantOptionsToAdd: [
          ...state.variantOptionsToAdd,
          ...action.payload.filter(
            (e) => !state.variantOptionsToAdd.includes(e),
          ),
        ],
      };
    case "ADD_VARIANT_NAMES_TO_ADD":
      return {
        ...state,
        variantNamesToAdd: [
          ...state.variantNamesToAdd,
          ...action.payload.filter((e) => !state.variantNamesToAdd.includes(e)),
        ],
      };
    case "ADD_INVALID_VARIANTS":
      return {
        ...state,
        invalidVariants: [
          ...state.invalidVariants,
          ...action.payload.filter(
            (e) => !state.invalidVariants.find((i) => i.id == e.id),
          ),
        ],
      };
    case "OVERWRITE_ALL":
      return {
        data: action.payload.data,
        lastFetched: new Date(),
        itemsToAdd: action.payload.itemsToAdd,
        itemsToUpdate: action.payload.itemsToUpdate,
        goodItems: action.payload.goodItems,
        itemsToRemove: action.payload.itemsToRemove,
        variantsToAdd: action.payload.variantsToAdd,
        variantsToUpdate: action.payload.variantsToUpdate,
        variantsToRemove: action.payload.variantsToRemove,
        variantOptionsToAdd: action.payload.variantOptionsToAdd,
        variantNamesToAdd: action.payload.variantNamesToAdd,
        invalidVariants: action.payload.invalidVariants,
        syncing: state.syncing,
        lastSyncedIndex: state.lastSyncedIndex,
      };
    case "RESET":
      return {
        lastFetched: new Date(),
        data: state.data,
        itemsToAdd: [],
        itemsToUpdate: [],
        goodItems: [],
        itemsToRemove: [],
        variantsToAdd: [],
        variantsToUpdate: [],
        variantsToRemove: [],
        variantOptionsToAdd: [],
        variantNamesToAdd: [],
        invalidVariants: [],
        syncing: false,
        lastSyncedIndex: undefined,
      };
    default:
      return state;
  }
};

const ProductsProvider: React.FC = (props: PropsWithChildren) => {
  const [state, dispatch] = useReducer(productsReducer, {
    data: [],
    itemsToAdd: [],
    itemsToUpdate: [],
    goodItems: [],
    itemsToRemove: [],
    variantsToAdd: [],
    variantsToUpdate: [],
    variantsToRemove: [],
    variantOptionsToAdd: [],
    variantNamesToAdd: [],
    invalidVariants: [],
    syncing: false,
  });

  return (
    <ProductsContext.Provider value={{ state, dispatch }}>
      {props.children}
    </ProductsContext.Provider>
  );
};

export default ProductsProvider;
