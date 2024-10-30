import React, { useEffect } from "react";
import { Card, RadioButton, Text } from "@shopify/polaris";

type FulfillmentOption = {
  title: string;
  description: string;
  value: "automatic" | "afterAssignment" | null;
};

const fulfillmentOptions: FulfillmentOption[] = [
  {
    title: "Automatic Fulfillment",
    description: `
      Products in Our Inventory: Orders with products stored in our inventory are marked as fulfilled in Shopify once they’re dispatched from our fulfillment center.
      Merchant-Managed Inventory: If the merchant handles fulfillment, we’ll mark the order as fulfilled in Shopify as soon as it’s picked up from their location.
    `,
    value: "automatic",
  },
  {
    title: "Fulfillment After Courier Assignment",
    description: `
      Orders will be marked as fulfilled in Shopify only after they've been assigned to a courier, regardless of whether the products are in our inventory or managed by the merchant.
    `,
    value: "afterAssignment",
  },
  {
    title: "No Shopify Updates",
    description: `
      Our system will not send any fulfillment updates to Shopify, leaving Shopify's fulfillment status unchanged.
    `,
    value: null,
  },
];

type FulfillmentSettingsProps = {
  defaultSelection?: string;
  onSelectionChange?: (selectedOption: string) => void;
};

const FulfillmentSettings: React.FC<FulfillmentSettingsProps> = ({
  defaultSelection,
  onSelectionChange,
}) => {
  const [selectedOption, setSelectedOption] = React.useState<string | null>(
    defaultSelection || null,
  );

  const handleOptionChange = (value: string | null) => {
    setSelectedOption(value);
    if (onSelectionChange) {
      onSelectionChange(value);
    }
  };

  // Set default selection if provided
  useEffect(() => {
    if (defaultSelection) {
      setSelectedOption(defaultSelection);
    }
  }, [defaultSelection]);

  return (
    <Card>
      {fulfillmentOptions.map((option) => (
        <div key={option.title} style={{ marginBottom: "16px" }}>
          <RadioButton
            label={option.title}
            checked={selectedOption === option.value}
            onChange={() => handleOptionChange(option.value)}
          />
          <div style={{ marginTop: "8px" }}>
            <Text variant="bodyMd" as="p" tone="subdued">
              {option.description}
            </Text>
          </div>
        </div>
      ))}
    </Card>
  );
};

export default FulfillmentSettings;
