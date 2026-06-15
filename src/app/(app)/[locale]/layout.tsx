import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
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
    <html lang={locale}>
      <body className={`antialiased ${inter.className} ${gilroy.variable}`}>
        <Header {...headerData} />
        {children}
        <Footer {...footerData} />
      </body>
    </html>
  );
}
