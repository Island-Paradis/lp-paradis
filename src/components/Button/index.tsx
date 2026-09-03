"use client";
import type { IconProps } from "@solar-icons/react/lib/types";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import { Slot } from "radix-ui";
import type React from "react";
import { ShineBorder } from "@/components/ui/shine-border";
import { useMagnetic } from "@/lib/use-magnetic";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center flex-row gap-3 rounded-full text-nowrap cursor-pointer transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary/90",
        // 1,5px fixos nos dois estados: `border` conta para dentro do box, e
        // engordá-lo só no hover encolheria a caixa de conteúdo meio pixel de
        // cada lado a meio da animação — visível nos botões `magnetic`.
        outline:
          "border-[1.5px] border-secondary text-primary hover:bg-secondary/40",
        // p/ fundos escuros (Footer, ProductsSection):
        // A borda transparente reserva a largura sem se ver: o `bg-white`
        // pinta por baixo dela, portanto em repouso o bloco não mostra aro.
        inverted:
          "border-[1.5px] border-transparent bg-white text-primary font-semibold hover:bg-white/90",
        "outline-inverted": "border border-white text-white hover:bg-white/40",
        // link-CTA (Card "Discover More"):
        link: "p-0 gap-2.5 rounded-none text-current hover:underline",
        // botão-ícone (hambúrguer):
        icon: "rounded-md text-neutral-600 hover:text-primary",
      },
      size: {
        sm: "px-5 py-2 text-sm",
        default: "px-6 py-3",
        lg: "px-14 py-2.5",
        icon: "p-2",
        none: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

/**
 * Como cada camada do botão inverte quando o painel de preenchimento sobe.
 *
 * Os cinco campos são obrigatórios de propósito. Uma variante nova que esqueça
 * `icon`, `rim` ou `shine` passa a falhar a compilação, em vez de ficar com a
 * cor fixa de repouso durante o hover — que é exactamente o bug que esta
 * tabela existe para corrigir: uma camada esquecida acaba da cor daquilo que
 * está atrás dela e desaparece.
 */
type SwapInvert = {
  /** Cor do rótulo em hover. Vai para o `<button>`. */
  text: string;
  /** O painel que sobe por trás do conteúdo. */
  fill: string;
  /** Disco do `circleIcon` e o glifo lá dentro, em hover. */
  icon: string;
  /** Cor do contorno em hover. Vai para o `<button>`. */
  rim: string;
  /**
   * Ajuste do anel de `shine` enquanto o painel sobe. String vazia é uma
   * declaração válida — e a única forma de dizer "esta variante não precisa" —,
   * mas tem de ser escrita.
   */
  shine: string;
};

const SHINE_PALETTE = ["#5B8DEF", "#9B5BEF", "#EF5B8D", "#5BD1EF", "#5B8DEF"];

type ButtonOwnProps = VariantProps<typeof buttonVariants> & {
  trailingIcon?: React.ComponentType<IconProps>;
  iconProps?: IconProps;
  circleIcon?: boolean;
  magnetic?: boolean;
  textSwap?: boolean;
  shine?: boolean;
};

type ButtonElementProps =
  | (React.ComponentProps<"button"> & {
      asChild?: boolean;
      href?: never;
      openInNewTab?: never;
    })
  | (Omit<React.ComponentProps<"a">, "href"> & {
      asChild?: never;
      href: string;
      openInNewTab?: boolean;
    });

type ButtonProps = ButtonOwnProps & ButtonElementProps;

export default function Button(props: ButtonProps) {
  const {
    className,
    variant,
    size,
    trailingIcon,
    iconProps,
    circleIcon,
    asChild = false,
    magnetic = false,
    textSwap = false,
    shine = false,
    href,
    openInNewTab = false,
    children,
    ...rest
  } = props;

  // `href` sem `asChild` é o caminho de âncora COM camadas. A união em
  // `ButtonElementProps` já impede os dois juntos; o `!asChild` aqui é o que
  // faz o `Comp` abaixo ser exaustivo sem depender dessa garantia de tipos.
  const isAnchor = !asChild && href !== undefined;

  // `href` NÃO entra nesta conta, de propósito: o caminho de âncora mantém o
  // deslize de rótulo. Só `asChild` o perde, e perde-o por o `Slot` aceitar um
  // filho único — ver o comentário em `ButtonElementProps`.
  const swap = textSwap && !asChild;

  // O anel é excluído do `asChild` pela MESMA razão mecânica, e não por
  // estética: o `Slot` entrega `children` cru e não tem onde receber uma
  // camada irmã. O caminho `href` fica dentro, como as camadas de inversão.
  const hasShine = shine && !asChild;

  // O disco só pode trocar de cor ao mesmo ritmo do painel: se saltasse para
  // branco à entrada do cursor, ficava branco sobre um botão ainda claro
  // durante os 500ms da subida — o mesmo defeito ao contrário.
  const iconSwap =
    "transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-white group-hover:text-primary";

  // Escurecimento do anel enquanto um painel CLARO sobe. Contra `#ffffff` só o
  // ciano da paleta falha (1.78:1); isto leva-o a 3.33:1 sem apagar os outros.
  //
  // Duas razões para os valores serem estes e não outros:
  //
  //   • `brightness(.7)` é o mínimo que passa o pior matiz dos 3:1. Mais
  //     escuro rouba contraste ao caso simétrico — o anel também tem de se ver
  //     contra o preenchimento de repouso enquanto o painel ainda não cobriu.
  //   • `saturate(1.4)` acompanha porque escurecer sozinho aproxima as quatro
  //     matizes umas das outras, e o que se perde é a leitura de gradiente.
  //
  // A duração e a curva são as do painel, pela razão que o `iconSwap` acima já
  // documenta: um ajuste mais rápido que a subida deixaria o anel escuro sobre
  // um botão ainda escuro a meio caminho.
  //
  // E o repouso declara o filtro IDENTIDADE em vez de o omitir. Isto não é
  // redundante: `filter: none → brightness(.7)` não interpola, salta — e o
  // salto lê-se como um pisco no primeiro frame do hover.
  const shineDim =
    "brightness-100 saturate-100 transition-[filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:brightness-[0.7] group-hover:saturate-[1.4]";

  const swapInvert: Record<string, SwapInvert> = {
    primary: {
      text: "hover:text-primary!",
      fill: "bg-white",
      icon: "",
      rim: "",
      // Painel claro: o anel precisa de escurecer.
      shine: shineDim,
    },
    outline: {
      text: "hover:text-white!",
      fill: "bg-primary",
      icon: iconSwap,
      // Igual ao `fill` de propósito: atrás do contorno está a página clara,
      // não o preenchimento, e é a fronteira preenchimento/página que carrega
      // a silhueta. Um aro mais claro aqui leria como halo.
      rim: "hover:border-primary!",
      // Painel escuro: as quatro matizes já passam 3,78:1 contra `#212528`.
      // Vazio é a declaração de "não precisa", e está escrita de propósito —
      // omiti-la faria a variante falhar a compilação, que é o ponto.
      shine: "",
    },
    inverted: {
      text: "hover:text-white!",
      fill: "bg-primary",
      icon: iconSwap,
      // A `ProductsSection` corre dentro de `bg-primary`, ou seja o
      // preenchimento de hover fica da cor da secção e o botão dissolve-se.
      // Opaco, e não `white/40`: o `background` pinta por baixo da borda e o
      // painel é `inset-0` (padding box), portanto o aro compõe-se sobre o
      // `bg-white` do próprio botão e o alfa não faria nada.
      rim: "hover:border-neutral-500!",
      // Painel escuro, como `outline`.
      shine: "",
    },
    "outline-inverted": {
      text: "hover:text-primary!",
      fill: "bg-white",
      icon: "",
      rim: "hover:border-white!",
      // Painel claro, como `primary`.
      shine: shineDim,
    },
  };
  const invert = swap ? swapInvert[variant ?? "primary"] : undefined;
  const Comp: React.ElementType = asChild
    ? Slot.Root
    : isAnchor
      ? "a"
      : magnetic
        ? motion.button
        : "button";

  // Âncora "nua" e não `motion.a`: o deslocamento magnético vem do
  // `<motion.span>` no fim do ficheiro, o mesmo que o caminho `asChild` já
  // usava. Animar a própria âncora daria dois mecanismos para o mesmo efeito.
  const anchorProps: Record<string, unknown> = isAnchor
    ? {
        href,
        target: openInNewTab ? "_blank" : undefined,
        // `noopener` impede a página de destino de alcançar o nosso `window`.
        rel: openInNewTab ? "noopener noreferrer" : undefined,
      }
    : {};

  const IconComponent = trailingIcon ?? null;

  const {
    ref: magneticRef,
    x,
    y,
    onMouseMove,
    onMouseLeave,
  } = useMagnetic({ strength: 0.4 });

  // Os dois caminhos que delegam o magnetismo ao wrapper — `asChild` e `href` —
  // ficam de fora: aplicar `style={{x, y}}` aqui E no wrapper somaria o
  // deslocamento duas vezes.
  const magneticProps: Record<string, unknown> =
    magnetic && !asChild && !isAnchor
      ? {
          ref: magneticRef,
          style: { x, y },
          onMouseMove,
          onMouseLeave,
        }
      : {};

  const label = swap ? (
    <span className="relative inline-grid overflow-hidden">
      <span className="col-start-1 row-start-1 block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-full">
        {children}
      </span>
      <span
        aria-hidden
        className="col-start-1 row-start-1 block translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0"
      >
        {children}
      </span>
    </span>
  ) : (
    children
  );

  const content = (
    <>
      {label}
      {IconComponent && (
        <span
          className={cn(
            "icon inline-flex items-center justify-center",
            circleIcon && "rounded-full bg-primary p-1 text-white",
            // Sem disco o glifo já inverte sozinho, por herdar `currentColor`
            // do botão — não leva regra de cor própria.
            circleIcon && invert?.icon,
          )}
        >
          <IconComponent {...iconProps} />
        </span>
      )}
    </>
  );

  const inner = (
    <Comp
      data-cursor="hover"
      className={cn(
        buttonVariants({ variant, size }),
        // O painel de preenchimento e o anel são os dois `absolute inset-0`:
        // ambos precisam que a caixa do botão seja o contexto de
        // posicionamento, e nenhum deles o tem de graça.
        (swap || hasShine) && "relative",
        // O `overflow-hidden` é só do painel, e fica de propósito fora da
        // conta do anel: o anel vive no limite exacto do clip, e recortá-lo
        // afina-o nas curvas da pill. O caminho `shine` sem `swap` — que é o
        // do submit de `/get-quote` — não paga esse recorte.
        swap && "group overflow-hidden isolate duration-500",
        invert?.text,
        invert?.rim,
        className,
      )}
      {...(rest as Record<string, unknown>)}
      {...anchorProps}
      {...magneticProps}
    >
      {asChild ? (
        children
      ) : (
        <>
          {invert && (
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0",
                invert.fill,
              )}
            />
          )}
          {/* A ORDEM destes três irmãos é o empilhamento, e é por isso que
              nenhum deles leva `z-index` próprio:

                painel  absolute, z auto  ─┐ mesmo nível, decide o DOM
                anel    absolute, z auto  ─┘ → anel acima do painel
                rótulo  relative, z-10      → acima dos dois

              O painel é `inset-0` e, em `primary`, é branco: por baixo dele o
              anel desaparecia no hover, exactamente quando o botão está a ser
              olhado. Acima do rótulo pintaria gradiente sobre os glifos. */}
          {/* `invert?.shine` é `undefined` fora do caminho `swap`, e isso é
              correcto por construção: o ajuste existe por causa do painel, e
              sem `swap` não há painel para ajustar contra. */}
          {hasShine && (
            <ShineBorder
              borderWidth={2}
              shineColor={SHINE_PALETTE}
              className={invert?.shine}
            />
          )}
          {swap || hasShine ? (
            <span className="relative z-10 inline-flex items-center gap-3">
              {content}
            </span>
          ) : (
            content
          )}
        </>
      )}
    </Comp>
  );

  // O wrapper serve os dois caminhos que não podem receber o `style` animado
  // directamente: `asChild`, porque o `style` iria para o filho e colidiria com
  // o dele, e `href`, por decisão acima de manter um só mecanismo.
  if (!magnetic || (!asChild && !isAnchor)) return inner;
  return (
    <motion.span
      ref={magneticRef as React.Ref<HTMLSpanElement>}
      className="inline-flex"
      style={{ x, y }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {inner}
    </motion.span>
  );
}

export { buttonVariants };
