import type { GlobalConfig } from "payload";

export const HomePage: GlobalConfig = {
  slug: "homepage",
  label: "Home Page",
  admin: {
    group: "Site Settings",
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "seo",
      type: "group",
      label: "SEO",
      fields: [
        {
          name: "metaTitle",
          type: "text",
          localized: true,
          label: "Meta Title",
        },
        {
          name: "metaDescription",
          type: "textarea",
          localized: true,
          label: "Meta Description",
        },
      ],
    },
    {
      name: "slug",
      type: "text",
      label: "Page Slug",
      defaultValue: "home",
      admin: {
        description: "Identifier for this page setup.",
      },
    },
    {
      name: "showNavbar",
      type: "checkbox",
      label: "Show Navbar",
      defaultValue: true,
    },
    {
      name: "hero",
      type: "group",
      label: "Hero Section",
      fields: [
        {
          name: "enabled",
          type: "checkbox",
          label: "Enable",
          defaultValue: true,
        },
        {
          name: "item",
          type: "relationship",
          relationTo: "hero",
          hasMany: false,
          label: "Hero",
        },
      ],
    },
    {
      name: "projects",
      type: "group",
      label: "Projects Section",
      fields: [
        {
          name: "enabled",
          type: "checkbox",
          label: "Enable",
          defaultValue: true,
        },
        {
          name: "title",
          type: "text",
          label: "Section Title",
        },
        {
          name: "subtitle",
          type: "textarea",
          label: "Section Subtitle",
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
          name: "items",
          type: "relationship",
          relationTo: "projects",
          hasMany: true,
          label: "Projects",
        },
      ],
    },
    {
      name: "services",
      type: "group",
      label: "Services Section",
      fields: [
        {
          name: "enabled",
          type: "checkbox",
          label: "Enable",
          defaultValue: true,
        },
        {
          name: "title",
          type: "text",
          label: "Section Title",
        },
        {
          name: "subtitle",
          type: "textarea",
          label: "Section Subtitle",
        },
        {
          name: "ourServicesCT",
          type: "group",
          label: "Our Services Container",
          fields: [
            {
              name: "title",
              type: "text",
              localized: true,
              label: "Title",
            },
            {
              name: "description",
              type: "textarea",
              localized: true,
              label: "Description",
            },
          ],
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
          name: "items",
          type: "relationship",
          relationTo: "services",
          hasMany: true,
          label: "Services",
        },
      ],
    },
    {
      name: "testimonials",
      type: "group",
      label: "Testimonials Section",
      fields: [
        {
          name: "enabled",
          type: "checkbox",
          label: "Enable",
          defaultValue: true,
        },
        {
          name: "title",
          type: "text",
          label: "Section Title",
        },
        {
          name: "subtitle",
          type: "textarea",
          label: "Section Subtitle",
        },
        {
          name: "items",
          type: "relationship",
          relationTo: "testimonials",
          hasMany: true,
          label: "Testimonials",
        },
      ],
    },
    {
      name: "faqs",
      type: "group",
      label: "FAQs Section",
      fields: [
        {
          name: "enabled",
          type: "checkbox",
          label: "Enable",
          defaultValue: true,
        },
        {
          name: "title",
          type: "text",
          label: "Section Title",
        },
        {
          name: "subtitle",
          type: "textarea",
          label: "Section Subtitle",
        },
        {
          name: "items",
          type: "relationship",
          relationTo: "faqs",
          hasMany: true,
          label: "FAQs",
        },
      ],
    },
    {
      name: "contact",
      type: "group",
      label: "Contact Section",
      fields: [
        {
          name: "enabled",
          type: "checkbox",
          label: "Enable",
          defaultValue: true,
        },
        {
          name: "item",
          type: "relationship",
          relationTo: "contact",
          hasMany: false,
          label: "Contact",
        },
      ],
    },
  ],
};
