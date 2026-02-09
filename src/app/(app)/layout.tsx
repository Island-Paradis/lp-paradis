import type { Metadata } from "next";
import { gilroy } from "@/fonts/gilroy";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paradis",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${gilroy.className} antialiased`}>
        <div className="flex flex-col h-screen  justify-center bg-zinc-100 dark:bg-black relative">
          <main>{children}</main>
          <footer className="w-full text-center py-4 text-sm text-zinc-500 bottom-4 absolute">
            &copy; {new Date().getFullYear()} Paradis Labs. All rights reserved.
          </footer>
        </div>
      </body>
    </html>
  );
}
