import type { CollectionConfig } from "payload";

export const Services: CollectionConfig = {
  slug: "services",
  labels: {
    singular: "Service",
    plural: "Services",
  },
  admin: {
    group: "Content",
    useAsTitle: "title",
    defaultColumns: ["title", "order", "updatedAt"],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      localized: true,
      label: "Title",
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      label: "Slug",
      index: true,
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (!value && data?.title) {
              return (data.title as string)
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, "-")
                .replace(/[^\w-]+/g, "")
                .replace(/--+/g, "-")
                .replace(/^-+|-+$/g, "");
            }
            return value;
          },
        ],
      },
      admin: {
        description: "Auto-generated from title if left empty",
      },
    },
    {
      name: "icon",
      type: "text",
      label: "Icon",
      admin: {
        description: "Lucide icon name (e.g. 'code', 'server', 'globe')",
      },
    },
    {
      name: "shortDescription",
      type: "textarea",
      required: true,
      localized: true,
      label: "Short Description",
      admin: {
        description: "Brief description shown on the services card",
      },
    },
    {
      name: "description",
      type: "richText",
      localized: true,
      label: "Full Description",
    },
    {
      name: "features",
      type: "array",
      label: "Features",
      admin: {
        description: "List of features or bullet points for this service",
      },
      fields: [
        {
          name: "feature",
          type: "text",
          required: true,
          localized: true,
          label: "Feature",
        },
      ],
    },
    {
      name: "coverImage",
      type: "upload",
      relationTo: "media",
      label: "Cover Image",
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
