"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useEffect,
  useState,
} from "react";

interface VideoAutoPauseProps {
  // Um único elemento `<video>`. Ele é renderizado como está — este componente
  // não desenha nada em volta.
  children: ReactNode;
  // Folga para retomar ANTES de o vídeo aparecer.
  //
  // O padrão é zero, e a escolha é medida, não estética. No layout atual o
  // vídeo começa a 940 px com a dobra em 900 — **40 px abaixo da dobra**. Uma
  // folga de 200 px o deixava tocando com a página no topo, que é a posição de
  // repouso mais comum da home; ou seja, a folga anulava o item no regime que
  // esta change mais quer atacar.
  //
  // O custo de não ter folga é baixo porque o arquivo chega inteiro
  // (`readyState: 4` medido), então `play()` retoma no ato. Se algum dia
  // aparecer um primeiro frame congelado em scroll rápido, o conserto certo é
  // o `poster` (tarefas 8.3–8.6 de `optimize-landing-performance`), não
  // devolver a folga.
  rootMargin?: string;
}

// Pausa um `<video autoplay loop>` quando ele sai da viewport ou a aba fica
// oculta, e retoma de onde parou ao voltar.
//
// Por que existe: decodificação de vídeo é custo contínuo de CPU e GPU que não
// depende de alguém estar olhando. Medido na baseline desta change — com o
// scroll no rodapé, três telas abaixo, o vídeo de fundo seguia com
// `paused: false` e `currentTime` avançando (6,5 s → 11,1 s entre duas
// leituras), fora da viewport nas duas.
//
// Por que ANEXA comportamento em vez de renderizar o vídeo:
//
// O `<video>` e seu `<source media>` continuam morando no componente de
// SERVIDOR. Este componente clona o filho só para pendurar uma ref, então o
// HTML servido é idêntico byte a byte e não há markup condicional — logo, não
// há divergência de hidratação possível. O projeto já tem cicatriz exatamente
// aí: ver o comentário sobre o React #418 em `HydrationSignal`, e a nota em
// `page.tsx` explicando por que o gate do vídeo é `<source media>` e não
// `matchMedia`.
//
// O `autoPlay` permanece no markup: o caminho sem JavaScript e o caminho antes
// da hidratação seguem exatamente como eram. Este componente só pode PAUSAR o
// que já estava tocando.
//
// Mesmo padrão de `reveal.tsx`: um client component que renderiza `children`
// atravessa a fronteira servidor/cliente sem arrastar a árvore junto.
export function VideoAutoPause({
  children,
  rootMargin = "0px",
}: VideoAutoPauseProps) {
  // Estado, e não ref: garante que o efeito rode quando o nó for anexado, sem
  // depender da ordem entre ref callback e efeito.
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!video) return;

    let inView = false;
    let pageVisible = document.visibilityState === "visible";

    const shouldPlay = () => inView && pageVisible;

    const sync = () => {
      if (shouldPlay()) {
        // `play()` devolve uma Promise que rejeita com `AbortError` quando um
        // `pause()` chega antes de a reprodução começar — cenário normal ao
        // rolar rápido pela seção. É comportamento do elemento, não erro.
        video.play().catch(() => {});
      } else {
        // `pause()` preserva `currentTime`, então retomar continua do frame em
        // que parou em vez de voltar ao início.
        //
        // Sem guard de `!video.paused`: chamar `pause()` num vídeo já pausado
        // é inócuo, e o guard escondia a corrida descrita abaixo.
        video.pause();
      }
    };

    // Torna a regra independente da ORDEM entre o `autoPlay` do markup e o
    // primeiro disparo do observer.
    //
    // Se o observer disparar primeiro, o vídeo ainda está pausado e a pausa é
    // inócua — e nada impediria o autoplay de começar logo depois. Reagir ao
    // evento `play` fecha esse caminho sem depender de quem chega antes: seja
    // quem for que inicie a reprodução, se não era para estar tocando, para.
    const handlePlay = () => {
      if (!shouldPlay()) video.pause();
    };
    video.addEventListener("play", handlePlay);

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { rootMargin },
    );
    io.observe(video);

    const handleVisibility = () => {
      pageVisible = document.visibilityState === "visible";
      sync();
    };
    document.addEventListener("visibilitychange", handleVisibility, {
      passive: true,
    });

    return () => {
      io.disconnect();
      video.removeEventListener("play", handlePlay);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [video, rootMargin]);

  const child = Children.only(children);
  if (!isValidElement(child)) return <>{children}</>;

  return cloneElement(child as ReactElement<{ ref?: Ref<HTMLVideoElement> }>, {
    ref: setVideo,
  });
}

export default VideoAutoPause;
