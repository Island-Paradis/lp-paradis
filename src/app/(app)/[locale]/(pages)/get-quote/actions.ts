"use server";

import type { Locale } from "@/i18n/routing";
import { locales } from "@/i18n/routing";
import {
  QUOTE_LIMITS,
  type QuoteFormState,
  quoteSubmissionSchema,
  toFieldErrors,
} from "@/lib/quote-request";
import { getPayloadInstance } from "@/service";
import { GLOBAL_SLUGS } from "@/service/constants";

// A submissão de `/get-quote`. Server Action e não route handler: `(payload)/api`
// é território gerado pelo Payload (o CLAUDE.md pede para não editar à mão) e a
// action dispensa serializar um contrato HTTP à parte.
//
// `locale` é o **primeiro** parâmetro de propósito: o server component liga-o com
// `.bind(null, locale)`, e o Next encripta os valores fechados numa action, o que
// o torna determinado no servidor em vez de vir no payload do cliente. Não existe
// caminho pelo qual o formulário envie o seu próprio locale — é o que o cenário
// "metadado forjado" da spec exige. A restante assinatura é a de `useActionState`.
export async function submitQuoteRequest(
  locale: Locale,
  _previous: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  // O honeypot é verificado antes de tudo, inclusive antes de tocar no banco:
  // um bot não merece a ida à base de dados. Preenchido ⇒ sucesso e nada
  // gravado. Devolver erro ensinaria o bot a evitar o campo.
  if (String(formData.get("honeypot") ?? "").trim() !== "") {
    return { status: "success" };
  }

  const payload = await getPayloadInstance();

  // A válvula de fecho da única escrita pública do site. Tem de agir aqui e não
  // só no render: esconder o formulário no cliente não fecha a action, e quem
  // já tenha a página aberta continuaria a submeter.
  //
  // `depth: 0` porque só a flag interessa — popular os serviços do grupo `form`
  // seria trabalho jogado fora em cada submissão.
  const settings = await payload.findGlobal({
    slug: GLOBAL_SLUGS.getQuote,
    depth: 0,
  });

  if (settings?.form?.enabled === false) {
    return { status: "error" };
  }

  const parsed = quoteSubmissionSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    message: formData.get("message") ?? "",
    interests: formData.getAll("interests").map(String),
    honeypot: "",
  });

  if (!parsed.success) {
    return {
      status: "invalid",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  const { name, email, message, interests } = parsed.data;

  try {
    // Os interesses chegam como slugs e são resolvidos contra a coleção. O que
    // não corresponder a nenhum serviço é simplesmente descartado — um id
    // forjado não entra na submissão, e os interesses válidos do mesmo envio
    // continuam a ser gravados.
    const matched =
      interests.length > 0
        ? await payload.find({
            collection: "services",
            where: { slug: { in: interests } },
            depth: 0,
            limit: QUOTE_LIMITS.interests,
            pagination: false,
          })
        : null;

    const services = matched?.docs ?? [];

    await payload.create({
      collection: "quote-requests",
      data: {
        name,
        email,
        message,
        services: services.map((service) => service.id),
        serviceSlugs: services.map((service) => service.slug),
        // Determinado no servidor. Um locale fora da lista suportada cai no
        // padrão em vez de rebentar a gravação por causa de metadados.
        submittedLocale: locales.includes(locale) ? locale : "en",
      },
    });
  } catch (error) {
    // O visitante recebe a mensagem genérica do CMS; o detalhe fica no log do
    // servidor, onde é útil sem expor nada.
    payload.logger.error({ err: error }, "quote-request create failed");
    return { status: "error" };
  }

  return { status: "success" };
}
