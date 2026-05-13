import type { CollectionConfig } from "payload";

export const Testimonials: CollectionConfig = {
  slug: "testimonials",
  labels: {
    singular: "Testimonial",
    plural: "Testimonials",
  },
  admin: {
    group: "Content",
    useAsTitle: "authorName",
    defaultColumns: ["authorName", "company", "rating", "updatedAt"],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "authorName",
      type: "text",
      required: true,
      label: "Author Name",
    },
    {
      name: "role",
      type: "text",
      localized: true,
      label: "Role / Position",
    },
    {
      name: "company",
      type: "text",
      label: "Company",
    },
    {
      name: "avatar",
      type: "upload",
      relationTo: "media",
      label: "Avatar",
    },
    {
      name: "quote",
      type: "textarea",
      required: true,
      localized: true,
      label: "Quote",
    },
    {
      name: "rating",
      type: "select",
      label: "Rating",
      defaultValue: "5",
      options: [
        { label: "1 Star", value: "1" },
        { label: "2 Stars", value: "2" },
        { label: "3 Stars", value: "3" },
        { label: "4 Stars", value: "4" },
        { label: "5 Stars", value: "5" },
      ],
    },
    {
      name: "featured",
      type: "checkbox",
      label: "Featured",
      defaultValue: false,
    },
    {
      name: "order",
      type: "number",
      label: "Order",
    },
  ],
};
