import type { PopulatedNavBar } from "@/service/types";
import Button from "../Button";
import { NavBar } from "../NavBar";

export default async function Header(args: PopulatedNavBar) {
  const logoSrc = args.logo?.image?.url ?? "/logo.svg";
  const logoHref = args.logo?.url ?? "/";
  const logoWidth = args.logo?.width ?? 134;
  const logoHeight = args.logo?.height ?? 25;

  return (
    <NavBar.Root>
      <NavBar.Logo
        imgSrc={logoSrc}
        href={logoHref}
        width={logoWidth}
        height={logoHeight}
      />
      <NavBar.MobileMenu>
        <NavBar.ItemList>
          {args.links &&
            args.links.length > 0 &&
            args.links.map((link) => (
              <NavBar.Item key={link.id ?? link.url} href={link.url}>
                {link.label}
              </NavBar.Item>
            ))}
        </NavBar.ItemList>
        <NavBar.ButtonWrap>
          {args.buttons &&
            args.buttons.length > 0 &&
            args.buttons.map((btn) => (
              <Button
                key={btn.id ?? btn.label}
                size="sm"
                variant={btn.variant ?? "primary"}
              >
                {btn.label}
              </Button>
            ))}
        </NavBar.ButtonWrap>
      </NavBar.MobileMenu>
    </NavBar.Root>
  );
}
