import { notFound } from "next/navigation";
import type React from "react";
import GetQuote from "@/components/GetQuote";
import type { Locale } from "@/i18n/routing";
import type { PopulatedGetQuotePage } from "@/service/types";



type Interests = NonNullable<
  NonNullable<PopulatedGetQuotePage["form"]>["interests"]
>;

const service = (slug: string, title: string) =>
  ({ slug, title }) as Interests[number];

const BASE: PopulatedGetQuotePage = {
  id: 1,
  seo: {
    metaTitle: "Get a Quote — Paradis",
    metaDescription: "Tell us what you're building.",
  },
  hero: {
    headline: "Let's build something\nthat moves you forward.",
    intro:
      "We're excited to hear what you're building. Drop the details below and we'll reply within one business day.",
  },
  availability: {
    enabled: true,
    label: "Available for new projects",
    location: "Luanda, Angola",
  },
  form: {
    enabled: true,
    eyebrow: "THE BRIEF",
    nameLabel: "Your name",
    emailLabel: "Your email",
    interestsLabel: "I'm interested in…",
    interests: [
      service("ui-ux-design", "UI/UX Design"),
      service("brand-identity", "Brand Identity"),
      service("mobile-development", "Mobile Development"),
      service("web-development", "Web Development"),
    ],
    messageLabel: "Tell us about your project",
    submitLabel: "Send enquiry",
    privacyNote: "Your details are safe — no ads, no spam.",
    messages: {
      success: "Thanks — we've got your brief.",
      error: "Something went wrong. Please try again.",
      nameRequired: "Please tell us your name.",
      emailRequired: "Please enter your email.",
      emailInvalid: "That email doesn't look right.",
      messageRequired: "Please tell us about your project.",
      tooLong: "That's a bit too long.",
    },
  },
};

const EMPTY_GLOBAL = {} as PopulatedGetQuotePage;

const CASES: Array<{
  scenario: string;
  prop: string;
  expected: string;
  args: PopulatedGetQuotePage;
}> = [
  {
    scenario: "Global inteira sem conteúdo",
    prop: "{} — nenhum campo (ver o cast acima)",
    expected:
      "renderiza sem lançar erro, com o piso de cada campo, e o layout permanece íntegro — headline, intro, pill e formulário todos presentes",
    args: EMPTY_GLOBAL,
  },
  {
    scenario: "Nenhum serviço ligado",
    prop: "form.interests: []",
    expected:
      "a secção de interesses desaparece INTEIRA, incluindo o rótulo — não fica um cabeçalho a apontar para o nada — e o resto do formulário continua utilizável",
    args: { ...BASE, form: { ...BASE.form, interests: [] } },
  },
  {
    scenario: "Pill de disponibilidade desativada",
    prop: "availability.enabled: false",
    expected:
      "a pill não é renderizada e o parágrafo de intro não muda de alinhamento nem herda espaço vazio no lugar dela",
    args: {
      ...BASE,
      availability: { ...BASE.availability, enabled: false },
    },
  },
  {
    scenario: "Pill ativa sem localidade",
    prop: 'availability.location: ""',
    expected:
      "a pill mostra só o ponto e o texto de estado; o separador `·` que precede a localidade também desaparece",
    args: {
      ...BASE,
      availability: { ...BASE.availability, location: "" },
    },
  },
  {
    scenario: "Botão sem rótulo authorado",
    prop: 'form.submitLabel: ""',
    expected:
      "o botão exibe o piso em código e permanece um destino rotulado, nunca uma pílula sem texto",
    args: { ...BASE, form: { ...BASE.form, submitLabel: "" } },
  },
  {
    scenario: "Formulário desligado",
    prop: "form.enabled: false",
    expected:
      "o formulário não é renderizado (nem o eyebrow), e headline, intro e pill continuam a ser apresentados",
    args: { ...BASE, form: { ...BASE.form, enabled: false } },
  },
];

function Case({
  index,
  scenario,
  prop,
  expected,
  children,
}: {
  index: number;
  scenario: string;
  prop: string;
  expected: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t-4 border-dashed border-neutral-400">
      <header className="bg-neutral-100 px-4 py-3 text-neutral-900">
        <p className="text-sm font-semibold">
          {index}. {scenario}
        </p>
        <p className="mt-1 font-mono text-xs text-neutral-700">{prop}</p>
        <p className="mt-1 text-xs text-neutral-600">
          <span className="font-semibold">esperado:</span> {expected}
        </p>
      </header>
      {children}
    </section>
  );
}

export default async function GetQuoteFixturePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { locale } = (await params) as { locale: Locale };

  return (
    <div className="bg-white">
      <header className="px-4 py-8 text-neutral-900">
        <h1 className="text-2xl font-semibold">
          Get Quote — estados degradados
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-700">
          Fixture só de desenvolvimento. Cada bloco renderiza o{" "}
          <code className="font-mono">GetQuote</code> da aplicação com props
          fabricadas em código — nenhuma consulta ao CMS alimenta os estados
          abaixo.
        </p>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-neutral-900">
          Contagem esperada: 6 páginas fabricadas. Os formulários são reais e a
          Server Action está ligada — submeter aqui GRAVA em{" "}
          <code className="font-mono">quote-requests</code>.
        </p>
        <p className="mt-1 max-w-3xl text-xs text-neutral-600">
          Cenários de origem:{" "}
          <code className="font-mono">
            add-get-quote-page/specs/get-quote-page
          </code>{" "}
          e{" "}
          <code className="font-mono">
            add-get-quote-page/specs/quote-request-intake
          </code>
          . Ver o mapa caso-a-cenário no topo deste ficheiro.
        </p>
      </header>

      {CASES.map((c, i) => (
        <Case
          key={c.scenario}
          index={i + 1}
          scenario={c.scenario}
          prop={c.prop}
          expected={c.expected}
        >
          <GetQuote {...c.args} locale={locale} />
        </Case>
      ))}
    </div>
  );
}
