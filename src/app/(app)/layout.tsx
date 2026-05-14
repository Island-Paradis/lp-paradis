import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerData = await getNavBarPayload("en");
  const footerData = await getFooterPayload("en");

  return (
    <html lang="en">
      <body className={`antialiased ${inter.className}`}>
        <Header {...headerData} />
        {children}
        <Footer {...footerData} />
      </body>
    </html>
  );
}
