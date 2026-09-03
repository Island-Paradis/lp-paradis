import { notFound } from "next/navigation";
import type React from "react";
import Header from "@/components/Header";
import type { Locale } from "@/i18n/routing";
import type { PopulatedNavBar } from "@/service/types";

// Fixture de desenvolvimento para os destinos do navbar e para o switch de
// idioma.
//
// Existe porque os cenários de `navbar-link-destinations` são sobre que `href`
// sai de cada `url` do CMS — âncora, `mailto:`, URL absoluta, campo vazio — e
// verificá-los pelo admin exigiria editar o global `Menu` seis vezes e repor. O
// contrato do `Header` é `PopulatedNavBar & { locale }`, props simples.
//
// Cenários de origem, em `add-navbar-locale-switch/specs/`:
//   navbar-link-destinations
//     • "Botão com URL" / "Botão sem URL authorada"    → casos 1 e 2
//     • "Link relativo" / "Link para a raiz"           → caso 1
//     • "Âncora na mesma página"                       → caso 1
//     • "Âncora sem barra inicial"                     → caso 3
//     • "URL externa" / "Destino mailto"               → caso 3
//     • "Locale propagado"                             → todos
//   navbar-locale-switch
//     • "A pílula apresenta o locale corrente"         → todos (segue a rota)
//     • "Sem identificadores duplicados"               → contagem abaixo
//
// **O switch NÃO é fabricável aqui.** Ele deriva o locale do `usePathname`, não
// de props — logo, em `/pt/fixtures/navbar` os seis navbars mostram todos `PT`, e
// em `/en/fixtures/navbar` mostram todos `EN`. Verificar a pílula nos dois
// estados é abrir esta rota nos dois locales, não comparar blocos.
//
// **Se o global `Menu` ganhar campos, esta fixture não quebra o build** — props
// a mais são opcionais — e passa a exercitar um navbar desactualizado sem
// avisar. Quem mexer no schema reconfere os cenários acima.

const BASE: PopulatedNavBar = {
  id: 1,
  links: [
    { id: "l1", label: "Home", url: "/", openInNewTab: false },
    { id: "l2", label: "Services", url: "/#services", openInNewTab: false },
    { id: "l3", label: "About Us", url: "/about", openInNewTab: false },
  ],
  buttons: [
    { id: "b1", label: "Get Quote", url: "/get-quote", variant: "primary" },
  ],
};

const CASES: Array<{
  scenario: string;
  prop: string;
  expected: string;
  args: PopulatedNavBar;
}> = [
  {
    scenario: "Conteúdo completo — prefixo de locale em tudo",
    prop: 'links: ["/", "/#services", "/about"], buttons: ["/get-quote"]',
    expected:
      "na rota /pt: os links apontam para /pt, /pt/#services e /pt/about, e o botão para /pt/get-quote — nenhum href sai sem prefixo",
    args: BASE,
  },
  {
    scenario: "Botão sem URL authorada",
    prop: 'buttons: [{ label: "Get Quote", url: "" }]',
    expected:
      "o botão continua a existir com o seu rótulo, mas NÃO é uma âncora — não parece clicável para lado nenhum",
    args: {
      ...BASE,
      buttons: [{ id: "b1", label: "Get Quote", url: "", variant: "primary" }],
    },
  },
  {
    scenario: "Destinos que NÃO devem receber prefixo",
    prop: 'links: ["#services", "https://kitenda.paradis.host/", "mailto:…"]',
    expected:
      "os três saem intactos: âncora sem barra continua #services, a URL absoluta e o mailto: não ganham /pt à frente — prefixar qualquer um quebraria o destino",
    args: {
      ...BASE,
      links: [
        { id: "l1", label: "Âncora crua", url: "#services" },
        {
          id: "l2",
          label: "Kitenda",
          url: "https://kitenda.paradis.host/",
          openInNewTab: true,
        },
        { id: "l3", label: "Email", url: "mailto:hello@paradis.host" },
      ],
    },
  },
  {
    scenario: "Sem links authorados",
    prop: "links: []",
    expected:
      "nenhum item de menu é renderizado; o switch e o botão continuam presentes e o logo permanece alinhado à esquerda",
    args: { ...BASE, links: [] },
  },
  {
    scenario: "Sem botões authorados",
    prop: "buttons: []",
    expected:
      "o switch de idioma continua a aparecer sozinho no ButtonWrap — ele não depende do CMS",
    args: { ...BASE, buttons: [] },
  },
  {
    scenario: "Global sem links nem botões",
    prop: "links: [], buttons: []",
    expected:
      "renderiza sem lançar erro, com logo e switch apenas, e o layout da barra permanece íntegro",
    args: { ...BASE, links: [], buttons: [] },
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

export default async function NavbarFixturePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Primeira coisa no corpo, antes de qualquer render. Fora de desenvolvimento
  // esta rota não existe: o Next devolve a 404 real da aplicação. Não linkar a
  // página nem um nome improvável impediriam acesso directo por URL, que é o
  // único acesso que importa aqui.
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { locale } = (await params) as { locale: Locale };

  return (
    <div className="bg-white">
      <header className="px-4 py-8 text-neutral-900">
        <h1 className="text-2xl font-semibold">
          Navbar — destinos e switch de idioma
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-700">
          Fixture só de desenvolvimento. Cada bloco renderiza o{" "}
          <code className="font-mono">Header</code> da aplicação com props
          fabricadas em código — nenhuma consulta ao CMS alimenta os estados
          abaixo.
        </p>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-neutral-900">
          Contagem esperada: 6 navbars fabricados + 1 navbar real herdado do
          layout, no topo da página. Total 7 — e{" "}
          <strong>7 pílulas de idioma em repouso</strong>. O{" "}
          <code className="font-mono">NavBarMobileMenu</code> põe os children em
          dois lugares, mas o portal mobile só é montado{" "}
          <em>enquanto o menu está aberto</em> (
          <code className="font-mono">isOpen &amp;&amp; createPortal</code>),
          pelo que a segunda cópia aparece só nesse intervalo — e é por isso que
          o switch não pode ter <code className="font-mono">id</code> fixo.
        </p>
        <p className="mt-1 max-w-3xl text-xs text-neutral-600">
          Abra esta rota em <code className="font-mono">/en</code> e em{" "}
          <code className="font-mono">/pt</code>: o switch deriva o locale do
          pathname, não de props, então a pílula acompanha a rota e não o caso.
          Ver o mapa caso-a-cenário no topo deste ficheiro.
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
          <Header {...c.args} locale={locale} />
        </Case>
      ))}
    </div>
  );
}
