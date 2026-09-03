import Footer from "@/components/Footer";
import type { Locale } from "@/i18n/routing";
import { getFooterPayload } from "@/service/payload-functions";

// O footer de toda rota que não tenha uma composição própria neste slot — hoje
// `/`, as três rotas de fixture, e qualquer rota futura que não se registe aqui.
//
// **Este ficheiro é a rede de 404 do slot.** Um slot de rota paralela sem
// `default.tsx` faz o Next devolver 404 na *página inteira*, não só no slot,
// quando uma navegação dura atinge uma rota que o slot não cobre. É por isso
// que ele existe antes de qualquer variante, e por isso que remover uma
// composição especializada é seguro mas remover este ficheiro não é.
//
// A busca da global mudou de sítio (vinha do `layout.tsx`) mas não de contagem:
// para um dado request só uma folha deste slot corre, então continua a ser uma
// query por request.
export default async function DefaultFooter({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const footerData = await getFooterPayload(locale);

  return <Footer {...footerData} locale={locale} />;
}
