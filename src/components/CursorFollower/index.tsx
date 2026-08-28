"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type CursorState = "default" | "hover" | "view";

// Accent cursor dot: keeps the native cursor visible and adds a single dot that
// follows the pointer. `mix-blend-difference` makes it read as black over light
// areas and white over dark ones (always visible). Over `[data-cursor="hover"]`
// targets (buttons/links) it grows into a larger inverting circle; over
// `[data-cursor="view"]` targets (project images) it becomes a solid circle with
// a "View" label. It never hides the native cursor. Only runs on fine pointers
// and respects `prefers-reduced-motion` (mirrors `cursor-glow.tsx`).
export default function CursorFollower() {
  const shouldReduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<CursorState>("default");

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  // Tight spring so the dot stays glued to the pointer.
  const cx = useSpring(x, { stiffness: 1200, damping: 50, mass: 0.3 });
  const cy = useSpring(y, { stiffness: 1200, damping: 50, mass: 0.3 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEnabled(window.matchMedia("(pointer: fine)").matches);
  }, []);

  const active = enabled && !shouldReduceMotion;

  useEffect(() => {
    if (!active) return;

    // O trabalho de React é coalescido por frame; as MotionValues não.
    //
    // `mousemove` dispara mais rápido que a taxa de atualização em telas de
    // alta frequência, e cada disparo que chamava `setState` agendava uma
    // renderização. Só o último evento de cada frame é observável, então o
    // resto era trabalho jogado fora — incluindo um `closest()`, que percorre
    // a árvore até a raiz.
    //
    // `x.set()`/`y.set()` ficam fora da coalescência de propósito: MotionValue
    // não passa pelo ciclo de render do React e já é lida no frame, então
    // adiar custaria responsividade sem economizar nada.
    let frame = 0;
    let pendingTarget: HTMLElement | null = null;

    const flush = () => {
      frame = 0;
      setVisible(true);
      // A travessia acontece aqui, uma vez por frame — não a cada evento.
      const match = pendingTarget?.closest<HTMLElement>("[data-cursor]");
      const next = match?.dataset.cursor as CursorState | undefined;
      setState(next === "hover" || next === "view" ? next : "default");
    };

    const handleMove = (event: MouseEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      pendingTarget = event.target as HTMLElement | null;
      if (!frame) frame = requestAnimationFrame(flush);
    };
    const handleLeave = () => setVisible(false);

    window.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseleave", handleLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseleave", handleLeave);
    };
  }, [active, x, y]);

  if (!active) return null;

  // O elemento tem tamanho fixo no MAIOR estado e é escalado para baixo.
  //
  // A direção não é indiferente. Uma camada rasterizada a 8px e ampliada 11x
  // chega borrada na borda; rasterizada a 90px e reduzida, chega nítida.
  //
  // Antes, os três estados vinham de `width`/`height` animados junto com
  // `marginLeft`/`marginTop` — quatro propriedades de LAYOUT sob mola, ou
  // seja, invalidação de layout e repaint a cada frame da transição. O mesmo
  // crescimento em `scale` não sai da etapa de composição.
  const BASE_SIZE = 90;
  const size = state === "view" ? 90 : state === "hover" ? 40 : 8;
  const isView = state === "view";

  return (
    <motion.div
      aria-hidden
      className={cn(
        "pointer-events-none fixed top-0 left-0 z-9999 flex items-center justify-center rounded-full bg-white",
        // Solid (no blend) in the "view" state so the label stays readable.
        !isView && "mix-blend-difference",
      )}
      style={{
        x: cx,
        y: cy,
        width: BASE_SIZE,
        height: BASE_SIZE,
        // A centralização continua vindo de margens, mas agora ESTÁTICAS:
        // derivam de `BASE_SIZE`, que é constante, então o layout é calculado
        // uma vez em vez de a cada frame da mola. Não dá para usar
        // `translateX: "-50%"` aqui — no Motion, `x` é apelido de
        // `translateX`, e os dois na mesma `style` se sobrescrevem.
        //
        // Como `transform-origin` é o centro, escalar mantém o ponto centrado.
        marginLeft: -BASE_SIZE / 2,
        marginTop: -BASE_SIZE / 2,
      }}
      animate={{
        scale: size / BASE_SIZE,
        opacity: visible ? 1 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
    >
      <AnimatePresence>
        {isView && (
          <motion.span
            className="text-xs font-medium tracking-wide text-black"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
          >
            View
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
