"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

// `prefers-reduced-motion` é atendido em CSS, não aqui: o `initial` era
// condicional e consultar a preferência no corpo da renderização divergia a
// hidratação em toda carga com ela ativa. A regra no fim de `globals.css`
// neutraliza o deslocamento de todo `[data-reveal]`, que este elemento
// carrega. Ver `@/lib/use-reduced-motion`.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      data-reveal
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
