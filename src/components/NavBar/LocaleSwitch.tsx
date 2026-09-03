"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { currentLocale, otherLocale, swapLocale } from "@/lib/locale-href";
import Button from "../Button";

const LOCALE_META: Record<Locale, { code: string; flag: string }> = {
  en: { code: "EN", flag: "/flag-en.svg" },
  pt: { code: "PT", flag: "/flag-pt.svg" },
};

const SWITCH_LABEL: Record<Locale, string> = {
  en: "Switch to English",
  pt: "Mudar para português",
};

export default function LocaleSwitch({ className }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const locale = currentLocale(pathname);
  const target = otherLocale(locale);

  const query = searchParams.toString();
  const href = `${swapLocale(pathname, target)}${query ? `?${query}` : ""}`;

  const meta = LOCALE_META[locale];

  return (
    <Button asChild variant="outline" size="sm" className={className}>
      <Link href={href} aria-label={SWITCH_LABEL[target]}>
        <span className="inline-flex items-center gap-2.5">
          <Image
            src={meta.flag}
            alt=""
            aria-hidden="true"
            width={23}
            height={23}
            className="size-5 shrink-0 rounded-full object-cover"
          />
          <span className="text-sm font-medium pr-1">{meta.code}</span>
        </span>
      </Link>
    </Button>
  );
}
