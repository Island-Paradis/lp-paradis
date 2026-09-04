import type { CollectionConfig } from "payload";

export const Projects: CollectionConfig = {
  slug: "projects",
  labels: {
    singular: "Project",
    plural: "Projects",
  },
  admin: {
    group: "Content",
    useAsTitle: "title",
    defaultColumns: ["title", "tags", "featured", "updatedAt"],
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
      name: "description",
      type: "textarea",
      required: true,
      localized: true,
      label: "Description",
    },
    {
      name: "coverImage",
      type: "upload",
      relationTo: "media",
      required: true,
      label: "Cover Image",
    },
    {
      name: "tags",
      type: "array",
      label: "Tags",
      fields: [
        {
          name: "tag",
          type: "text",
          required: true,
          localized: true,
          label: "Tag",
        },
      ],
    },
    {
      name: "url",
      type: "text",
      required: true,
      label: "Project URL",
      admin: {
        description: "External link to the live project",
      },
    },
    {
      name: "githubUrl",
      type: "text",
      label: "GitHub URL",
    },
    {
      name: "featured",
      type: "checkbox",
      label: "Featured",
      defaultValue: false,
      admin: {
        description: "Show this project in the featured section",
      },
    },
  ],
};
