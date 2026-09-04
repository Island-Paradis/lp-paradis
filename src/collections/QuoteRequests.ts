import type { CollectionConfig } from "payload";

// As submissões do formulário de `/get-quote`. O admin é a inbox — nenhum lead
// depende de e-mail, porque não há transporte configurado no `payload.config.ts`.
//
// **O access control aqui é o oposto do resto do repo, e é de propósito.** Todas
// as outras coleções e globals usam `read: () => true` porque são conteúdo de
// marketing — existem para ser lidas por qualquer visitante. Esta guarda nome,
// e-mail e a descrição do projeto de terceiros. Copiar o padrão por hábito
// publicaria os leads em `GET /api/quote-requests`, sem autenticação nenhuma.
export const QuoteRequests: CollectionConfig = {
  slug: "quote-requests",
  labels: {
    singular: "Quote Request",
    plural: "Quote Requests",
  },
  admin: {
    group: "Submissions",
    useAsTitle: "email",
    defaultColumns: ["name", "email", "createdAt"],
  },
  access: {
    // Um formulário anónimo implica escrita pública: é a única escrita pública
    // do site. A válvula de fecho é a flag `form.enabled` da global
    // `get-quote-page`, verificada na Server Action.
    create: () => true,
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      label: "Name",
    },
    {
      name: "email",
      type: "email",
      required: true,
      label: "Email",
    },
    {
      name: "message",
      type: "textarea",
      required: true,
      label: "Message",
    },
    {
      // A relação serve a navegação no admin: clicar leva ao serviço.
      name: "services",
      type: "relationship",
      relationTo: "services",
      hasMany: true,
      label: "Interests",
    },
    {
      // O snapshot textual serve a leitura da submissão *depois* de o serviço
      // ser apagado ou renomeado. Sem ele, apagar um serviço deixaria a
      // submissão a apontar para o vazio e o lead ilegível.
      name: "serviceSlugs",
      type: "text",
      hasMany: true,
      label: "Interest Slugs",
      admin: {
        readOnly: true,
        description:
          "Slugs dos serviços no momento da submissão. Sobrevive a um serviço apagado ou renomeado.",
      },
    },
    {
      // Derivado no servidor a partir do segmento de rota. `readOnly` para não
      // ser editado à mão no admin; a Server Action ignora qualquer valor de
      // locale que venha do cliente.
      name: "submittedLocale",
      type: "select",
      label: "Submitted From",
      options: [
        { label: "English", value: "en" },
        { label: "Português", value: "pt" },
      ],
      admin: {
        readOnly: true,
        description: "Locale da página onde a submissão foi feita.",
      },
    },
  ],
};
