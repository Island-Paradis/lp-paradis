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
    defaultColumns: ["authorName", "company", "updatedAt"],
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
      name: "tag",
      type: "text",
      required: true,
      localized: true,
      label: "Social tag",
    },
    {
      name: "social",
      type: "select",
      required: true,
      label: "Social",
      options: [
        { label: "Instagram", value: "instagram" },
        { label: "LinkedIn", value: "linkedin" },
        { label: "Twitter / X", value: "twitter" },
        { label: "Facebook", value: "facebook" },
        { label: "YouTube", value: "youtube" },
        { label: "GitHub", value: "github" },
        { label: "WhatsApp", value: "whatsapp" },
        { label: "Discord", value: "discord" },
        { label: "Other", value: "other" },
      ],
    },
    {
      name: "avatar",
      type: "upload",
      required: true,
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
      name: "featured",
      type: "checkbox",
      label: "Featured",
      defaultValue: false,
    },
  ],
};
