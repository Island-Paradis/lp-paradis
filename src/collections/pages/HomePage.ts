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
      required: true,
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
          required: true,
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
          required: true,
          label: "Section Title",
        },
        {
          name: "subtitle",
          type: "textarea",
          required: true,
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
              defaultValue: "View Our Work",
            },
            {
              name: "url",
              type: "text",
              label: "URL",
              // Era `/projects`, uma rota que não existe. O valor nunca chegou
              // à base de dados — `defaultValue` no Payload só se aplica na
              // criação do documento, e este global já existia — portanto o
              // conteúdo real era `#` e ninguém notou. `#` explícito alinha a
              // schema com o que lá está e com a convenção do `Hero`.
              defaultValue: "#",
              admin: {
                description:
                  "Um destino em calendly.com (ou subdomínio) abre o calendário num popup por cima da página, em vez de navegar. A detecção é pelo endereço — não há campo que a ligue ou desligue. Deixar em '#' mantém o botão inerte, sem link.",
              },
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
          required: true,
          label: "Section Title",
          defaultValue: "Our Services",
        },
        {
          name: "subtitle",
          type: "textarea",
          required: true,
          label: "Section Subtitle",
          defaultValue: "",
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
              defaultValue: "What We Offer",
            },
            {
              name: "description",
              type: "textarea",
              localized: true,
              label: "Description",
              defaultValue: "",
            },
            {
              name: "backgroundVideo",
              type: "upload",
              relationTo: "media",
              label: "Background Video",
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
                description:
                  "Um destino em `calendly.com` (ou subdomínio) abre o calendário num popup por cima da página, em vez de navegar — a detecção é pelo endereço, não há campo que a ligue. Deixar em `#` mantém o botão inerte, sem link.",
              },
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
          defaultValue: "Testimonials",
        },
        {
          name: "subtitle",
          type: "textarea",
          label: "Section Subtitle",
          defaultValue: "",
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
          defaultValue: "Frequently Asked Questions",
        },
        {
          name: "subtitle",
          type: "textarea",
          label: "Section Subtitle",
          defaultValue: "",
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
