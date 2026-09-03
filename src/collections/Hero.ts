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
      required: true,
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
          required: true,
          localized: true,
          label: "Label",
        },
        {
          name: "url",
          type: "text",
          label: "URL",
          defaultValue: "#",
          admin: {
            description:
              "Um destino em calendly.com (ou subdomínio) abre o calendário num popup por cima da página, em vez de navegar. A detecção é pelo endereço — não há campo que a ligue ou desligue. Deixar em '#' mantém o botão inerte, sem link.",
          },
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
          required: true,
          localized: true,
          label: "Label",
        },
        {
          name: "url",
          type: "text",
          label: "URL",
          defaultValue: "#",
          admin: {
            description:
              "Um destino em calendly.com (ou subdomínio) abre o calendário num popup por cima da página, em vez de navegar. A detecção é pelo endereço — não há campo que a ligue ou desligue. Deixar em '#' mantém o botão inerte, sem link.",
          },
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
