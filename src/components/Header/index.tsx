import type { PopulatedNavBar } from "@/service/types";
import Button from "../Button";
import { NavBar } from "../NavBar";
import { NavActiveProvider } from "../NavBar/NavActiveContext";

export default async function Header(args: PopulatedNavBar) {
  const logoSrc = args.logo?.image?.url ?? "/logo.svg";
  const logoLightSrc = args.logo?.imageLight?.url ?? logoSrc;
  const logoHref = args.logo?.url ?? "/";
  const logoWidth = args.logo?.width ?? 134;
  const logoHeight = args.logo?.height ?? 25;

  const sectionIds = (args.links ?? [])
    .map((link) => link.url)
    .filter((url): url is string => !!url?.includes("#"))
    .map((url) => url.split("#")[1]);

  return (
    <NavActiveProvider ids={sectionIds}>
      <NavBar.Root>
        <NavBar.Logo
          imgSrc={logoSrc}
          href={logoHref}
          width={logoWidth}
          height={logoHeight}
        />
        <NavBar.MobileMenu
          logoSrc={logoLightSrc}
          logoHref={logoHref}
          logoWidth={logoWidth}
          logoHeight={logoHeight}
        >
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
                  className={btn.variant === "outline" ? "bg-white" : ""}
                  variant={btn.variant ?? "primary"}
                >
                  {btn.label}
                </Button>
              ))}
          </NavBar.ButtonWrap>
        </NavBar.MobileMenu>
      </NavBar.Root>
    </NavActiveProvider>
  );
}
