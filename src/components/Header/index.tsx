import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import type { Media } from "../../../payload-types";
import Button from "../Button";
import { NavBar } from "../NavBar";

export default async function Header() {
  const payload = await getPayload({ config });
  const menu = await payload.findGlobal({
    slug: "menu",
    depth: 1,
    locale: "en",
  });

  const logoImage = menu.logo?.image as Media | null | undefined;
  const logoSrc = logoImage?.url ?? "/logo.svg";
  const logoHref = menu.logo?.url ?? "/";
  const logoWidth = menu.logo?.width ?? 134;
  const logoHeight = menu.logo?.height ?? 25;

  return (
    <NavBar.Root>
      <NavBar.Logo
        imgSrc={logoSrc}
        href={logoHref}
        width={logoWidth}
        height={logoHeight}
      />
      <NavBar.ItemList>
        {menu.links?.map((link) => (
          <NavBar.Item key={link.id ?? link.url} href={link.url}>
            {link.label}
          </NavBar.Item>
        ))}
      </NavBar.ItemList>
      <NavBar.ButtonWrap>
        {menu.buttons?.map((btn) => (
          <Button
            key={btn.id}
            className="px-5 py-2"
            variant={btn.variant ?? "primary"}
          >
            {btn.label}
          </Button>
        ))}
      </NavBar.ButtonWrap>
    </NavBar.Root>
  );
}
