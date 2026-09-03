import type { GlobalConfig } from "payload";

// A página `/get-quote`. Global e não documento de uma coleção `Pages` pelo
// mesmo motivo que a `HomePage`: o layout é desenhado, não composto por blocos.
// Quando existirem quatro ou cinco páginas parecidas a coleção passa a valer;
// até lá um global por página é o padrão do repo.
//
// **Nenhum campo de texto é `required`.** É deliberado e não é desleixo: os
// cenários de `get-quote-page` exigem que a página renderize inteira com a
// global vazia, e um campo obrigatório impediria o admin de gravar o estado
// parcial que esses cenários descrevem. O texto que aparece quando um campo
// está vazio vive em `src/components/GetQuote/index.tsx` (o mapa `FALLBACK`),
// não em `defaultValue` daqui — `defaultValue` só age na primeira criação e não
// protege contra um campo esvaziado depois.
export const GetQuotePage: GlobalConfig = {
  slug: "get-quote-page",
  label: "Get Quote Page",
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
      name: "hero",
      type: "group",
      label: "Hero",
      fields: [
        {
          // `textarea` e não `text` porque o design quebra o headline em duas
          // linhas ("Let's build something / that moves you forward.") e a
          // quebra é escolha editorial, não consequência da largura.
          name: "headline",
          type: "textarea",
          localized: true,
          label: "Headline",
          admin: {
            description:
              "Título grande no topo. Quebras de linha são respeitadas. Vazio usa o texto padrão do design.",
          },
        },
        {
          name: "intro",
          type: "textarea",
          localized: true,
          label: "Intro Paragraph",
          admin: {
            description:
              "Parágrafo à direita, abaixo do headline. Vazio usa o texto padrão do design.",
          },
        },
      ],
    },
    {
      name: "availability",
      type: "group",
      label: "Availability Pill",
      admin: {
        description:
          "A cápsula com o ponto verde (ex.: 'Available for new projects · Luanda, Angola').",
      },
      fields: [
        {
          name: "enabled",
          type: "checkbox",
          label: "Show Pill",
          defaultValue: true,
        },
        {
          name: "label",
          type: "text",
          localized: true,
          label: "Status Label",
          admin: {
            condition: (_data, siblingData) => Boolean(siblingData?.enabled),
          },
        },
        {
          name: "location",
          type: "text",
          localized: true,
          label: "Location",
          admin: {
            description:
              "Opcional. Vazio remove também o separador que a precede.",
            condition: (_data, siblingData) => Boolean(siblingData?.enabled),
          },
        },
      ],
    },
    {
      name: "form",
      type: "group",
      label: "Form",
      fields: [
        {
          name: "enabled",
          type: "checkbox",
          label: "Enable Form",
          defaultValue: true,
          admin: {
            description:
              "Válvula de fecho da única escrita pública do site. Desligar esconde o formulário E faz a Server Action rejeitar submissões — sem deploy de código. Use se aparecer spam.",
          },
        },
        {
          name: "eyebrow",
          type: "text",
          localized: true,
          label: "Eyebrow",
          admin: {
            description:
              "Rótulo pequeno acima do formulário (ex.: 'THE BRIEF').",
          },
        },
        {
          name: "nameLabel",
          type: "text",
          localized: true,
          label: "Name Field Label",
        },
        {
          name: "emailLabel",
          type: "text",
          localized: true,
          label: "Email Field Label",
        },
        {
          name: "interestsLabel",
          type: "text",
          localized: true,
          label: "Interests Label",
        },
        {
          // Os chips saem da coleção `Services` — decisão 2 do design. O rótulo
          // de cada chip é o `title` do serviço; a identidade gravada na
          // submissão é o `slug`, para um título reescrito não invalidar
          // submissões antigas.
          name: "interests",
          type: "relationship",
          relationTo: "services",
          hasMany: true,
          label: "Selectable Interests",
          admin: {
            description:
              "Os chips de 'I'm interested in…' são serviços desta lista. Um interesse que ainda não exista em Services (ex.: 'API & Integrations', 'AI Solutions') precisa primeiro de ser criado como serviço. Lista vazia esconde a secção de interesses inteira.",
          },
        },
        {
          name: "messageLabel",
          type: "text",
          localized: true,
          label: "Message Field Label",
        },
        {
          name: "submitLabel",
          type: "text",
          localized: true,
          label: "Submit Button Label",
        },
        {
          name: "privacyNote",
          type: "text",
          localized: true,
          label: "Privacy Note",
          admin: {
            description:
              "Texto ao lado do botão (ex.: 'Your details are safe — no ads, no spam.').",
          },
        },
        {
          // Estas mensagens são campos do CMS e não strings do zod porque este
          // projeto não tem catálogo de mensagens do next-intl: `i18n/request.ts`
          // devolve só `locale`, sem `messages`. O Payload é o único sítio onde
          // uma string pode ter versão em `en` e em `pt`.
          name: "messages",
          type: "group",
          label: "Messages",
          admin: {
            description:
              "Textos de estado e de validação. Vazios usam o texto padrão em código.",
          },
          fields: [
            {
              name: "success",
              type: "textarea",
              localized: true,
              label: "Success",
            },
            {
              name: "error",
              type: "textarea",
              localized: true,
              label: "Submission Error",
            },
            {
              name: "nameRequired",
              type: "text",
              localized: true,
              label: "Validation — Name Required",
            },
            {
              name: "emailRequired",
              type: "text",
              localized: true,
              label: "Validation — Email Required",
            },
            {
              name: "emailInvalid",
              type: "text",
              localized: true,
              label: "Validation — Email Invalid",
            },
            {
              name: "messageRequired",
              type: "text",
              localized: true,
              label: "Validation — Message Required",
            },
            {
              name: "tooLong",
              type: "text",
              localized: true,
              label: "Validation — Too Long",
            },
          ],
        },
      ],
    },
  ],
};
