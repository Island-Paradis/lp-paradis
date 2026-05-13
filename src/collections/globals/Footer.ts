import type { GlobalConfig } from "payload";

export const Footer: GlobalConfig = {
  slug: "footer",
  label: "Footer",
  admin: {
    group: "Globals",
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "logo",
      type: "upload",
      relationTo: "media",
      label: "Logo",
    },
    {
      name: "tagline",
      type: "text",
      localized: true,
      label: "Tagline",
      admin: {
        description: "Short phrase shown below the logo",
      },
    },
    {
      name: "linkGroups",
      type: "array",
      label: "Link Groups",
      admin: {
        description: "Columns of links displayed in the footer (e.g. Quick Links, Company, Products)",
      },
      fields: [
        {
          name: "title",
          type: "text",
          required: true,
          localized: true,
          label: "Group Title",
        },
        {
          name: "links",
          type: "array",
          label: "Links",
          fields: [
            {
              name: "name",
              type: "text",
              required: true,
              localized: true,
              label: "Label",
            },
            {
              name: "href",
              type: "text",
              required: true,
              label: "URL",
            },
            {
              name: "isExternal",
              type: "checkbox",
              label: "Open in new tab",
              defaultValue: false,
            },
          ],
        },
      ],
    },
    {
      name: "cta",
      type: "group",
      label: "Call to Action",
      admin: {
        description: "CTA block shown on the right side of the footer",
      },
      fields: [
        {
          name: "heading",
          type: "text",
          localized: true,
          label: "Heading",
        },
        {
          name: "primaryButton",
          type: "group",
          label: "Primary Button",
          fields: [
            {
              name: "label",
              type: "text",
              required: true,
              localized: true,
              label: "Label",
            },
            {
              name: "href",
              type: "text",
              required: true,
              label: "URL",
            },
          ],
        },
        {
          name: "outlineButton",
          type: "group",
          label: "Outline Button",
          fields: [
            {
              name: "label",
              type: "text",
              required: true,
              localized: true,
              label: "Label",
            },
            {
              name: "href",
              type: "text",
              required: true,
              label: "URL",
            },
          ],
        },
      ],
    },
    {
      name: "copyrightText",
      type: "text",
      localized: true,
      label: "Copyright Text",
      admin: {
        description: "Text shown in the bottom bar (e.g. 'Paradis.Labs - All rights reserved.')",
      },
    },
  ],
};
