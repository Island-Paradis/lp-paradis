import { notFound } from "next/navigation";
import type React from "react";
import Footer from "@/components/Footer";
import type { Locale } from "@/i18n/routing";
import type { FooterContactBand, PopulatedFooter } from "@/service/types";


const BASE: PopulatedFooter = {
  id: 1,
  tagline: "Because we were born into this world",
  linkGroups: [
    {
      title: "Quick Links",
      links: [
        { name: "Home", href: "/", isExternal: false },
        { name: "Services", href: "/#services", isExternal: false },
        {
          name: "Kitenda",
          href: "https://kitenda.paradis.host/",
          isExternal: true,
        },
      ],
    },
  ],
  cta: {
    heading: "Ready to build?",
    primaryButton: { label: "Get Quote - For Free", href: "/get-quote" },
    outlineButton: { label: "Schedule a Call", href: "/get-quote" },
  },
  copyrightText: "Paradis Labs - All rights reserved.",
  socialLinks: [
    {
      platform: "linkedin",
      url: "https://www.linkedin.com/company/paradis-labs",
      label: "Paradis Labs on LinkedIn",
    },
  ],
};


const EMPTY_GLOBAL = {} as PopulatedFooter;

const THREE_SOCIALS: NonNullable<PopulatedFooter["socialLinks"]> = [
  {
    platform: "instagram",
    url: "https://www.instagram.com/paradis.labs",
    label: "Paradis Labs on Instagram",
  },
  {
    platform: "linkedin",
    url: "https://www.linkedin.com/company/paradis-labs",
    label: "Paradis Labs on LinkedIn",
  },
  {
    platform: "dribbble",
    url: "https://dribbble.com/paradislabs",
    label: "Paradis Labs on Dribbble",
  },
];

const CASES: Array<{
  scenario: string;
  prop: string;
  expected: string;
  args: PopulatedFooter;

  contactBand?: FooterContactBand;
}> = [
  {
    scenario: "Copyright sem texto authorado",
    prop: 'copyrightText: ""',
    expected:
      "a barra inferior exibe o fallback declarado, mantendo o ano — não fica reduzida a um símbolo de copyright solto",
    args: { ...BASE, copyrightText: "" },
  },
  {
    scenario: "Botão sem rótulo authorado",
    prop: 'cta.primaryButton.label: ""',
    expected:
      "o botão exibe o fallback e permanece um destino rotulado, nunca uma pílula sem texto",
    args: {
      ...BASE,
      cta: { ...BASE.cta, primaryButton: { label: "", href: "/get-quote" } },
    },
  },
  {
    scenario: "Global inteiro sem conteúdo",
    prop: "{} — nenhum campo (ver o cast acima)",
    expected:
      "renderiza sem lançar erro, exibindo os fallbacks de cada campo, e o layout da página permanece íntegro",
    args: EMPTY_GLOBAL,
  },
  {
    scenario: "Nenhum link social authorado",
    prop: "socialLinks: []",
    expected:
      "nenhum ícone é renderizado, o copyright permanece alinhado à esquerda, e nenhum espaço reservado vazio aparece à direita",
    args: { ...BASE, socialLinks: [] },
  },
  {
    scenario: "Plataforma sem ícone mapeado",
    prop: 'socialLinks: [{ platform: "youtube", … }]',
    expected:
      "a entrada continua sendo um destino navegável, com o `label` como conteúdo visível em vez do ícone, e a página não quebra",
    args: {
      ...BASE,
      socialLinks: [
        {
          platform: "youtube",
          url: "https://www.youtube.com/@paradislabs",
          label: "Paradis Labs on YouTube",
        },
      ],
    },
  },
  {
    scenario: "FAIXA — conteúdo completo",
    prop: "contactBand: { headings, email } + 3 redes",
    expected:
      "a faixa abre o footer com o título e o e-mail à esquerda, o título e três pills rotuladas à direita, e um divider a separá-la do logo",
    args: { ...BASE, socialLinks: THREE_SOCIALS },
    contactBand: {
      reachHeading: "Reach Us Directly",
      socialHeading: "Elsewhere",
      email: "geral@paradis.host",
    },
  },
  {
    scenario: "FAIXA — coleção Contact vazia",
    prop: "contactBand.email: undefined",
    expected:
      "o grupo de contacto some INTEIRO, incluindo o seu título — um título sozinho seria pior que a ausência; as pills continuam, e o divider fica",
    args: { ...BASE, socialLinks: THREE_SOCIALS },
    contactBand: {
      reachHeading: "Reach Us Directly",
      socialHeading: "Elsewhere",
      email: undefined,
    },
  },
  {
    scenario: "FAIXA — nenhuma rede authorada",
    prop: "socialLinks: [] com e-mail presente",
    expected:
      "o grupo de redes some inteiro, incluindo o título `Elsewhere`; o e-mail continua e o divider fica. A barra inferior também perde os ícones, pela mesma ausência",
    args: { ...BASE, socialLinks: [] },
    contactBand: {
      reachHeading: "Reach Us Directly",
      socialHeading: "Elsewhere",
      email: "geral@paradis.host",
    },
  },
  {
    scenario: "FAIXA — sem e-mail e sem redes",
    prop: "socialLinks: [] + email: undefined",
    expected:
      "a faixa NÃO renderiza, e o divider tem de sumir com ela — um divider sozinho separaria nada de nada. O footer fica indistinguível do das outras rotas",
    args: { ...BASE, socialLinks: [] },
    contactBand: {
      reachHeading: "Reach Us Directly",
      socialHeading: "Elsewhere",
      email: undefined,
    },
  },
  {
    scenario: "FAIXA — títulos esvaziados no admin",
    prop: 'reachHeading: "", socialHeading: "   "',
    expected:
      "os dois títulos caem no piso em código e nenhum fica em branco — string vazia e só-espaços contam como ausente",
    args: { ...BASE, socialLinks: THREE_SOCIALS },
    contactBand: {
      reachHeading: "",
      socialHeading: "   ",
      email: "geral@paradis.host",
    },
  },
  {
    scenario: "FAIXA — plataforma sem nome derivável",
    prop: 'socialLinks: [{ platform: "other", … }]',
    expected:
      "a pill continua a renderizar e a ser clicável, com o `label` como texto visível — omiti-la seria o pior modo de falha; as outras pills mostram o nome de marca normalmente",
    args: {
      ...BASE,
      socialLinks: [
        ...THREE_SOCIALS,
        {
          platform: "other",
          url: "https://paradis.host",
          label: "Paradis Labs elsewhere",
        },
      ],
    },
    contactBand: {
      reachHeading: "Reach Us Directly",
      socialHeading: "Elsewhere",
      email: "geral@paradis.host",
    },
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

export default async function FooterFixturePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {

  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { locale } = (await params) as { locale: Locale };

  return (
    <main className="bg-white">
      <header className="px-4 py-8 text-neutral-900">
        <h1 className="text-2xl font-semibold">Footer — estados degradados</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-700">
          Fixture só de desenvolvimento. Cada bloco renderiza o{" "}
          <code className="font-mono">Footer</code> da aplicação com props
          fabricadas em código — nenhuma consulta ao CMS alimenta os estados
          abaixo, e nada é escrito no banco.
        </p>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-neutral-900">
          Contagem esperada: 11 footers fabricados + 1 footer real, no fim da
          página. Total 12. Os casos 1–5 exercitam a composição corrente, sem
          faixa; os casos 6–11 exercitam a faixa de contacto direto, que na
          aplicação só existe em <code className="font-mono">/get-quote</code>.
          O footer real desta página vem do slot{" "}
          <code className="font-mono">@footer/default.tsx</code>, e portanto não
          tem faixa — é isso que se espera dele.
        </p>
        <p className="mt-1 max-w-3xl text-xs text-neutral-600">
          Cenários de origem:{" "}
          <code className="font-mono">
            finish-footer-implementation/specs/footer-content-authority
          </code>
          . O sexto cenário daquele requisito — "CTA sem heading authorado" —
          não está aqui de propósito: já é verificado em produção, porque{" "}
          <code className="font-mono">cta_heading</code> é{" "}
          <code className="font-mono">null</code> e o fallback aparece em todo
          render.
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
          <Footer {...c.args} locale={locale} contactBand={c.contactBand} />
        </Case>
      ))}

      <section className="border-t-4 border-dashed border-neutral-400">
        <header className="bg-amber-100 px-4 py-3 text-neutral-900">
          <p className="text-sm font-semibold">
            12. CONTROLE — footer real da aplicação
          </p>
          <p className="mt-1 text-xs text-neutral-700">
            O próximo footer abaixo NÃO é fabricado. Vem do slot{" "}
            <code className="font-mono">@footer/default.tsx</code>, com os dados
            reais do CMS, como em qualquer página do site que não seja{" "}
            <code className="font-mono">/get-quote</code>. Está aqui como
            controle: &ldquo;conteúdo real e completo&rdquo;, para comparar com
            os onze acima. Não é um décimo segundo estado. Ele não tem faixa, e
            é essa a composição correta para esta rota.
          </p>
        </header>
      </section>
    </main>
  );
}
