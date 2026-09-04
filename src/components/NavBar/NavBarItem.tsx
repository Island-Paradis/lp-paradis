"use client";

import Link from "next/link";
import type React from "react";
import { twJoin } from "tailwind-merge";
import type { Locale } from "@/i18n/routing";
import { localizedHref } from "@/lib/locale-href";
import { useNavActive } from "./NavActiveContext";
import { useNavMobileMenu } from "./NavMobileMenuContext";

interface NavBarItemProps {
  href?: string;
  // O locale corrente, vindo do servidor pelo `Header`. Sem ele o `href` cru do
  // CMS (`/#services`) navegava sem prefixo e o middleware decidia o idioma pelo
  // cookie — trocar para `/pt` e clicar num link devolvia o visitante a `/en`.
  locale: Locale;
  openInNewTab?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function NavBarItem({
  href,
  locale,
  openInNewTab = false,
  children,
  className,
}: NavBarItemProps) {
  const { activeHash } = useNavActive();
  const { close } = useNavMobileMenu();

  // O hash é calculado a partir do `href` CRU, antes do prefixo. Prefixar não
  // muda a parte depois do `#`, mas manter o cálculo na origem deixa a relação
  // com `activeHash` óbvia em vez de dependente da forma do prefixo.
  const hash = href?.includes("#") ? href.split("#")[1] : undefined;
  const isActive = !!hash && hash === activeHash;

  const destination = href ? localizedHref(href, locale) : "#";

  return (
    <li
      className={twJoin(
        "flex items-start justify-start px-5 py-0 lg:py-2",
        className,
      )}
    >
      <Link
        href={destination}
        onClick={close}
        target={openInNewTab ? "_blank" : undefined}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
        className={twJoin(
          "font-normal text-[26px] lg:text-base transition-colors duration-200 lg:hover:text-primary",
          isActive
            ? "text-white lg:text-primary"
            : "text-white/70 lg:text-neutral-600",
        )}
      >
        {children}
      </Link>
    </li>
  );
}
