import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import CursorFollower from "@/components/CursorFollower";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HydrationSignal from "@/components/HydrationSignal";
import SmoothScroll from "@/components/SmoothScroll";
import { gilroy } from "@/fonts/gilroy";
import type { Locale } from "@/i18n/routing";
import {
  getFooterPayload,
  getNavBarPayload,
} from "@/service/payload-functions";

export const metadata: Metadata = {
  title: "Paradis",
  description: "",
};

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Prazo antes de assumir que o React não vai hidratar e forçar a visibilidade
// de todo elemento animado.
//
// Erra para o lado folgado de propósito. Disparar cedo demais custa a animação
// de entrada — um defeito estético. Não disparar deixa a página ilegível. Os
// dois lados não têm o mesmo peso.
//
// Foi 4000 e era estreito demais. Medido no dev server deste projeto: `load`
// em 6822ms e hidratação em ~5919ms, ambos DEPOIS do prazo. Ali o timer só não
// disparou porque a thread principal bloqueia por vários segundos em dev e
// atrasou o próprio timer para além da hidratação — sorte, não projeto. Um
// aparelho lento em produção cai no mesmo buraco.
const REVEAL_FAILSAFE_MS = 10000;

// Detecção de estado para a rede de segurança de visibilidade (ver o comentário
// no fim de `globals.css`). Duas classes separam três mundos:
//
//   sem `.js`             o script não rodou: JavaScript desabilitado, bundle
//                         bloqueado, ou crawler.
//   `.js` só              caminho feliz, ou hidratação ainda em curso.
//   `.reveal-failsafe`    o script rodou e o React não sinalizou dentro do
//                         prazo: a hidratação falhou.
//
// Precisa ser bloqueante e vir antes de qualquer `[data-reveal]`, senão a regra
// de segurança casaria por um frame e o conteúdo piscaria visível antes de
// animar. Sem `nonce` porque o projeto não define CSP; se uma vier a existir,
// este script passa a precisar de um.
const REVEAL_FAILSAFE_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');setTimeout(function(){if(!window.__revealReady){d.classList.add('reveal-failsafe')}},${REVEAL_FAILSAFE_MS})})()`;

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = (await params) as { locale: Locale };

  const headerData = await getNavBarPayload(locale);
  const footerData = await getFooterPayload(locale);

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body className={`antialiased ${inter.className} ${gilroy.variable}`}>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: precisa rodar antes da primeira pintura */}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_FAILSAFE_SCRIPT }} />
        <HydrationSignal />
        <CursorFollower />
        <SmoothScroll>
          <Header {...headerData} />
          {children}
          <Footer {...footerData} />
        </SmoothScroll>
      </body>
    </html>
  );
}
