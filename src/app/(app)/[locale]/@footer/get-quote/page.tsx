import { cache } from "react";
import Footer from "@/components/Footer";
import type { Locale } from "@/i18n/routing";
import {
  getContactPayload,
  getFooterPayload,
} from "@/service/payload-functions";

// O footer da página de orçamento: o mesmo componente das outras rotas, mais a
// faixa de contacto direto. É esta folha do slot `@footer` que faz da faixa uma
// coisa de uma rota só — o mapeamento rota → composição vive aqui, em código, e
// não numa flag do CMS, que ligaria a faixa em todo o lado ou em lado nenhum.
//
// A busca do `Contact` acontece **só aqui**. É a razão de a faixa não custar
// nada às outras rotas: o `default.tsx` ao lado não a conhece, e para um dado
// request só uma das duas folhas corre.

export default async function GetQuoteFooter({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  const footerData = await  getFooterPayload(locale)
  

 
  const contactBand = {
    reachHeading: footerData.directContact?.reachHeading,
    socialHeading: footerData.directContact?.socialHeading,
    email: footerData.directContact?.emailHeading,
  };

  return <Footer {...footerData} locale={locale} contactBand={contactBand} />;
}
