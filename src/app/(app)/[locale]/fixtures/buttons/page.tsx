import { ArrowRight, ArrowRightDown } from "@solar-icons/react";
import { notFound } from "next/navigation";
import type React from "react";
import Button from "@/components/Button";



const VARIANTS = [
  "primary",
  "outline",
  "inverted",
  "outline-inverted",
] as const;

function Row({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-xs opacity-60">{title}</span>
      <div className="flex flex-row flex-wrap items-center gap-6">
        {children}
      </div>
    </div>
  );
}

function Matrix({ surface }: { surface: "light" | "dark" }) {
  return (
    <section
      className={
        surface === "dark"
          ? "flex flex-col gap-10 rounded-2xl bg-primary p-10 text-white"
          : "flex flex-col gap-10 rounded-2xl bg-white p-10 text-neutral-900"
      }
    >
      <h2 className="text-lg font-semibold">
        {surface === "dark" ? "Sobre bg-primary" : "Sobre fundo claro"}
      </h2>

      <Row title="textSwap — cada variante">
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant} textSwap>
            <span>{variant}</span>
          </Button>
        ))}
      </Row>

      <Row title="textSwap + circleIcon">
        {VARIANTS.map((variant) => (
          <Button
            key={variant}
            variant={variant}
            trailingIcon={ArrowRightDown}
            iconProps={{ size: 20 }}
            circleIcon
            textSwap
          >
            <span>{variant}</span>
          </Button>
        ))}
      </Row>

      <Row title="textSwap + ícone nu (herda currentColor)">
        {VARIANTS.map((variant) => (
          <Button
            key={variant}
            variant={variant}
            trailingIcon={ArrowRight}
            iconProps={{ size: 24 }}
            textSwap
          >
            <span>{variant}</span>
          </Button>
        ))}
      </Row>

      <Row title="magnetic — as combinações reais da home">
        <Button
          variant="outline"
          trailingIcon={ArrowRightDown}
          circleIcon
          magnetic
          textSwap
        >
          <span>CTA Serviços (page.tsx)</span>
        </Button>
        <Button
          variant="inverted"
          size="lg"
          trailingIcon={ArrowRight}
          iconProps={{ size: 24 }}
          magnetic
          textSwap
        >
          <span>CTA Produtos (ProductsSection)</span>
        </Button>
      </Row>

      <Row title="href — âncora com camadas (comparar com a 1.ª linha)">
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant} href="#href-ancora" textSwap>
            <span>{variant}</span>
          </Button>
        ))}
      </Row>

      <Row title="href + circleIcon + magnetic — o CTA do Hero depois da fiação">
        <Button
          variant="outline"
          href="#href-ancora"
          trailingIcon={ArrowRightDown}
          iconProps={{ size: 20 }}
          circleIcon
          magnetic
          textSwap
        >
          <span>Schedule a Call</span>
        </Button>
        <Button
          variant="primary"
          href="https://example.com"
          openInNewTab
          textSwap
        >
          <span>openInNewTab (ver target/rel no DOM)</span>
        </Button>
      </Row>

      {/* Controle: sem `textSwap` não se passa pelo `swapInvert`. Estes têm de
          ficar exactamente como estavam antes da change — é o botão do rodapé. */}
      <Row title="controle — sem textSwap (caminho da cva, não deve ter mudado)">
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
      </Row>
    </section>
  );
}

export default async function ButtonsFixturePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="flex flex-col gap-8 bg-neutral-100 p-8">
      <header className="text-neutral-900">
        <h1 className="text-2xl font-semibold">Button — inversão no hover</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-700">
          Fixture só de desenvolvimento. O hover <strong>não</strong> está
          forçado — passe o rato. Cada variante aparece sobre os dois fundos
          porque o fundo faz parte do caso:{" "}
          <code className="font-mono">inverted</code> preenche com{" "}
          <code className="font-mono">bg-primary</code>, que é a cor da secção
          onde o CTA de Produtos vive.
        </p>
      </header>
      <Matrix surface="light" />
      <Matrix surface="dark" />
    </main>
  );
}
