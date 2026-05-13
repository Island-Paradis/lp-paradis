import type { CollectionConfig } from "payload";

export const Contact: CollectionConfig = {
  slug: "contact",
  labels: {
    singular: "Contact",
    plural: "Contacts",
  },
  admin: {
    group: "Content",
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "sectionTitle",
      type: "text",
      localized: true,
      label: "Section Title",
    },
    {
      name: "sectionSubtitle",
      type: "textarea",
      localized: true,
      label: "Section Subtitle",
    },
    {
      name: "email",
      type: "email",
      label: "Email Address",
    },
    {
      name: "phone",
      type: "text",
      label: "Phone Number",
    },
    {
      name: "address",
      type: "textarea",
      localized: true,
      label: "Address",
    },
    {
      name: "socialLinks",
      type: "array",
      label: "Social Links",
      fields: [
        {
          name: "platform",
          type: "select",
          required: true,
          label: "Platform",
          options: [
            { label: "GitHub", value: "github" },
            { label: "LinkedIn", value: "linkedin" },
            { label: "Twitter / X", value: "twitter" },
            { label: "Instagram", value: "instagram" },
            { label: "Facebook", value: "facebook" },
            { label: "YouTube", value: "youtube" },
            { label: "Discord", value: "discord" },
            { label: "WhatsApp", value: "whatsapp" },
            { label: "Other", value: "other" },
          ],
        },
        {
          name: "url",
          type: "text",
          required: true,
          label: "URL",
        },
        {
          name: "label",
          type: "text",
          localized: true,
          label: "Display Label",
        },
      ],
    },
    {
      name: "formEnabled",
      type: "checkbox",
      label: "Enable Contact Form",
      defaultValue: true,
    },
    {
      name: "formRecipientEmail",
      type: "email",
      label: "Form Recipient Email",
      admin: {
        description: "Email address that receives form submissions",
        condition: (data) => data.formEnabled,
      },
    },
  ],
};
