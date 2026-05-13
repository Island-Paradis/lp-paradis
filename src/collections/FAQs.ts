import type { CollectionConfig } from "payload";

export const FAQs: CollectionConfig = {
  slug: "faqs",
  labels: {
    singular: "FAQ",
    plural: "FAQs",
  },
  admin: {
    group: "Content",
    useAsTitle: "question",
    defaultColumns: ["question", "category", "order", "updatedAt"],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "question",
      type: "text",
      required: true,
      localized: true,
      label: "Question",
    },
    {
      name: "answer",
      type: "richText",
      required: true,
      localized: true,
      label: "Answer",
    },
    {
      name: "category",
      type: "select",
      label: "Category",
      options: [
        { label: "General", value: "general" },
        { label: "Services", value: "services" },
        { label: "Pricing", value: "pricing" },
        { label: "Technical", value: "technical" },
        { label: "Support", value: "support" },
      ],
      defaultValue: "general",
    },
    {
      name: "order",
      type: "number",
      label: "Order",
      admin: {
        description: "Display order (lower numbers appear first)",
      },
    },
  ],
};
