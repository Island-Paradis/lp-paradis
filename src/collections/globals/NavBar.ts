import type { GlobalConfig } from "payload";

export const Menu: GlobalConfig = {
  slug: "menu",
  label: "Navigation Menu",
  admin: {
    group: "Site Settings",
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "logo",
      type: "group",
      label: "Logo",
      fields: [
        {
          name: "image",
          type: "upload",
          required: true,
          relationTo: "media",
          label: "Logo Image",
        },
        {
          name: "url",
          type: "text",
          required: true,
          label: "Logo URL",
          defaultValue: "/",
          admin: {
            description: "Where the logo links to",
          },
        },
        {
          name: "width",
          type: "number",
          required: true,
          label: "Width (px)",
          defaultValue: 134,
        },
        {
          name: "height",
          type: "number",
          required: true,
          label: "Height (px)",
          defaultValue: 25,
        },
      ],
    },
    {
      name: "links",
      type: "array",
      label: "Links",
      admin: {
        description: "Navigation links shown in the navbar",
      },
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
          localized: true,
          label: "Label",
        },
        {
          name: "url",
          type: "text",
          required: true,
          label: "URL",
          admin: {
            description: "e.g. /#services or /about",
          },
        },
        {
          name: "openInNewTab",
          type: "checkbox",
          label: "Open in new tab",
          defaultValue: false,
        },
      ],
    },
    {
      name: "buttons",
      type: "array",
      label: "Buttons",
      admin: {
        description: "Action buttons shown on the right side of the navbar",
      },
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
          localized: true,
          label: "Label",
        },
        {
          name: "url",
          type: "text",
          required: true,
          label: "URL",
        },
        {
          name: "variant",
          type: "select",
          label: "Variant",
          defaultValue: "primary",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Outline", value: "outline" },
          ],
        },
        {
          name: "openInNewTab",
          type: "checkbox",
          label: "Open in new tab",
          defaultValue: false,
        },
      ],
    },
  ],
};

