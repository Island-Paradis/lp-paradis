"use client";

import { useLenis } from "lenis/react";
import { useCallback, useEffect, useRef } from "react";
import { isCalendlyHref, loadCalendlyWidget } from "@/lib/calendly";

// A classe que o `initPopupWidget` põe no elemento que injecta no `body`. É
// parte da API pública do widget na prática, mas não contratualmente — se o
// Calendly a mudar, a travagem de scroll deixa de ligar e o fundo passa a rolar
// por trás do popup. Degradação visível e não bloqueio, que é o lado certo
// para onde falhar.
const OVERLAY_SELECTOR = ".calendly-overlay";

/**
 * Abre o calendário do Calendly num popup, e trava o scroll do fundo enquanto
 * ele está aberto.
 *
 * **Por que a travagem não é aplicada ao clique.** O modo de falha mais grave
 * desta funcionalidade é o scroll ficar travado para sempre: o visitante não
 * consegue rolar a página e não tem forma de perceber por quê. Travar ao clique
 * e destravar ao fechar produz exactamente isso sempre que o popup não chega a
 * abrir — script bloqueado, rede a cair, `initPopupWidget` a lançar.
 *
 * Daí a ordem ser a inversa: o `MutationObserver` liga primeiro, e a travagem
 * só acontece quando ele CONFIRMA o overlay no DOM. Se o popup nunca abre, nada
 * foi travado e não há nada a reparar.
 *
 * **Por que um observador e não um callback.** O `initPopupWidget` não devolve
 * handle nem aceita callback de fecho, e o evento `message` que o Calendly
 * emite cobre o agendamento (`calendly.event_scheduled`), não o fecho pelo `X`
 * nem o clique fora. Observar o DOM é o único sinal que cobre os três.
 */
export function useCalendlyPopup(href: string | null | undefined) {
  const lenis = useLenis();

  const lockedRef = useRef(false);
  const previousOverflowRef = useRef("");
  const observerRef = useRef<MutationObserver | null>(null);

  const unlock = useCallback(() => {
    if (!lockedRef.current) return;
    lockedRef.current = false;

    document.body.style.overflow = previousOverflowRef.current;

    if (lenis) {
      // Zerar antes de retomar, pela mesma razão que `LenisFrameDriver` em
      // `components/SmoothScroll/index.tsx` já documenta: o Lenis calcula
      // `deltaTime = time - (this.time || time)` e **não clampa** esse delta.
      // Um `time` de antes do popup produziria um `advance()` com delta enorme
      // no primeiro frame — um salto de scroll ao fechar.
      (lenis as unknown as { time: number }).time = 0;
      lenis.start();
    }
  }, [lenis]);

  const lock = useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;

    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // `body { overflow: hidden }` sozinho não chega: o Lenis não usa o scroll
    // nativo do documento, portanto continuaria a mover o conteúdo por
    // `transform` com o overflow travado.
    lenis?.stop();
  }, [lenis]);

  // Destravamento incondicional ao desmontar. Sem isto, uma navegação de rota
  // com o popup aberto — o botão do menu, o logo, o `back` do browser — deixaria
  // o `body` preso em `overflow: hidden` na página seguinte.
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      unlock();
    };
  }, [unlock]);

  const watchOverlay = useCallback(() => {
    if (observerRef.current) return;

    const observer = new MutationObserver(() => {
      const present = !!document.querySelector(OVERLAY_SELECTOR);

      if (present) {
        lock();
        return;
      }

      // Só desliga depois de ter havido overlay: as primeiras mutações chegam
      // enquanto o widget ainda está a montar, e desligar aí perderia o fecho.
      if (lockedRef.current) {
        unlock();
        observer.disconnect();
        observerRef.current = null;
      }
    });

    observer.observe(document.body, { childList: true });
    observerRef.current = observer;
  }, [lock, unlock]);

  return useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isCalendlyHref(href)) return;

      // Um clique com modificador é um pedido explícito do visitante para abrir
      // noutro sítio — nova aba, nova janela. Engoli-lo com `preventDefault`
      // trocaria uma capacidade nativa do browser por um popup que ele não
      // pediu.
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const url = href as string;
      event.preventDefault();

      // Ligar o observador ANTES de pedir o script: o `initPopupWidget` injecta
      // o overlay de forma sincronizada com a sua própria chamada, e um
      // observador ligado depois podia perder a inserção.
      watchOverlay();

      loadCalendlyWidget()
        .then((calendly) => calendly.initPopupWidget({ url }))
        .catch(() => {
          // Fallback da spec: o CTA nunca fica sem resposta. Navegar para o
          // mesmo destino é o comportamento que a âncora teria tido sem
          // JavaScript nenhum.
          observerRef.current?.disconnect();
          observerRef.current = null;
          window.location.href = url;
        });
    },
    [href, watchOverlay],
  );
}
