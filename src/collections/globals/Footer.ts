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
      defaultValue: "",
      admin: {
        description: "Short phrase shown below the logo",
      },
    },
    {
      name: "directContact",
      type: "group",
      label: "Direct Contact Band",
      admin: {
        description:
          "Headings for the band shown at the top of the footer on the Get Quote page only. Other pages never show this band. The email address displayed next to these headings is NOT set here — it comes from the Contact collection, so that there is a single source of truth for it.",
      },
      fields: [
        {
          name: "reachHeading",
          type: "text",
          localized: true,
          label: "Contact Heading",
          defaultValue: "",
          admin: {
            description:
              "Sits above the email address (e.g. 'Reach Us Directly'). The email itself comes from the Contact collection.",
          },
        },
        {
          name: "emailHeading",
          type: "text",
          localized: true,
          label: "Email Heading",
          defaultValue: "",
          admin: {
            description:
              "Sits above the email address (e.g. 'Email Us'). The email itself comes from the Contact collection.",
          },
        },
        {
          name: "socialHeading",
          type: "text",
          localized: true,
          label: "Social Heading",
          defaultValue: "",
          admin: {
            description:
              "Sits above the social pills (e.g. 'Elsewhere'). The pills themselves come from Social Links below.",
          },
        },
      ],
    },
    {
      name: "linkGroups",
      type: "array",
      label: "Link Groups",
      admin: {
        description:
          "Columns of links displayed in the footer (e.g. Quick Links, Company, Products)",
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
        description:
          "CTA block shown on the right side of the footer. Um destino em calendly.com (ou subdomínio) em qualquer dos dois botões abre o calendário num popup por cima da página, em vez de navegar — a detecção é pelo endereço, não há campo que a ligue ou desligue. Deixar em '#' mantém o botão inerte, sem link.",
      },
      fields: [
        {
          name: "heading",
          type: "text",
          localized: true,
          label: "Heading",
          defaultValue: "",
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
              defaultValue: "Contact Us",
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
      defaultValue: "Paradis.Labs - All rights reserved.",
      admin: {
        description:
          "Text shown in the bottom bar (e.g. 'Paradis.Labs - All rights reserved.')",
      },
    },
    {
      name: "socialLinks",
      type: "array",
      label: "Social Links",
      admin: {
        description:
          "Icons shown at the right of the bottom bar, in the order added here. Icons exist for Dribbble, LinkedIn and Instagram; any other platform falls back to showing its label as text.",
      },
      fields: [
        {
          name: "platform",
          type: "select",
          required: true,
          label: "Platform",
          options: [
            { label: "Dribbble", value: "dribbble" },
            { label: "LinkedIn", value: "linkedin" },
            { label: "Instagram", value: "instagram" },
            { label: "GitHub", value: "github" },
            { label: "Twitter / X", value: "twitter" },
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
          admin: {
            description: "Absolute URL. Opens in a new tab.",
          },
        },
        {
          name: "label",
          type: "text",
          required: true,
          localized: true,
          label: "Accessible Label",
          admin: {
            description:
              "Not shown on screen — it is the link's accessible name, read by screen readers (e.g. 'Paradis on LinkedIn').",
          },
        },
      ],
    },
  ],
};
