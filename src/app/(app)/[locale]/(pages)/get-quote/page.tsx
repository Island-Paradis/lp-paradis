import type { Metadata } from "next";
import { cache } from "react";
import GetQuote from "@/components/GetQuote";
import type { Locale } from "@/i18n/routing";
import { getQuotePagePayload } from "@/service/payload-functions";

interface GetQuoteRouteProps {
  params: Promise<{ locale: Locale }>;
}

const getContent = cache((locale: Locale) => getQuotePagePayload(locale));

export async function generateMetadata({
  params,
}: GetQuoteRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const content = await getContent(locale);

  const title = content?.seo?.metaTitle?.trim();
  const description = content?.seo?.metaDescription?.trim();

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  };
}

export default async function GetQuoteRoute({ params }: GetQuoteRouteProps) {
  const { locale } = await params;
  const content = await getContent(locale);

  return <GetQuote {...content} locale={locale} />;
}
