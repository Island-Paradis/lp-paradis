import type { CollectionConfig } from "payload";

export const Hero: CollectionConfig = {
  slug: "hero",
  labels: {
    singular: "Hero",
    plural: "Heroes",
  },
  admin: {
    group: "Content",
    useAsTitle: "headline",
    defaultColumns: ["headline", "updatedAt"],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "headline",
      type: "text",
      required: true,
      localized: true,
      label: "Headline",
    },
    {
      name: "subheadline",
      type: "text",
      localized: true,
      label: "Subheadline",
    },
    {
      name: "description",
      type: "textarea",
      localized: true,
      label: "Description",
    },
    {
      name: "primaryCta",
      type: "group",
      label: "Primary CTA",
      fields: [
        {
          name: "label",
          type: "text",
          localized: true,
          label: "Label",
        },
        {
          name: "url",
          type: "text",
          label: "URL",
        },
      ],
    },
    {
      name: "secondaryCta",
      type: "group",
      label: "Secondary CTA",
      fields: [
        {
          name: "label",
          type: "text",
          localized: true,
          label: "Label",
        },
        {
          name: "url",
          type: "text",
          label: "URL",
        },
      ],
    },
    {
      name: "backgroundImage",
      type: "upload",
      relationTo: "media",
      label: "Background Image",
    },
  ],
};
