import localFont from "next/font/local";

// Apenas os pesos que o site de fato usa.
//
// A declaração anterior tinha 20 faces — 10 pesos × normal/itálico. Como
// `next/font/local` faz preload de toda face declarada, o browser baixava os
// 18 TTFs a cada carregamento: 1.224.350 B, 10% do peso da página, medido no
// perfil de referência. Itálicos inclusive, que o site nunca usou.
//
// Auditoria de `--font-gilroy` (a variável é exposta como tema em
// `globals.css`, então o grep em TSX sozinho não bastava): a família é
// aplicada em exatamente dois lugares, e ambos declaram o peso —
// `page.tsx` com `font-medium` (500) e `Hero/index.tsx` com `font-bold` (700).
// Nenhum uso em itálico, nenhum uso sem peso explícito.
//
// Se um dia alguém escrever `font-gilroy` sem classe de peso, o browser
// resolve para a face mais próxima (500) em vez de sintetizar — visualmente
// próximo o bastante, e o custo de guardar 400 "por precaução" seria 65 KB
// em toda visita.
//
// WOFF2, e não TTF: `next/font/local` serve o arquivo declarado sem
// transcodificar, então declarar TTF significa entregar TTF. As mesmas duas
// faces em WOFF2 custam 68% menos (281 KB → 90 KB no disco).
export const gilroy = localFont({
  src: [
    {
      path: "./gilroy/Gilroy-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./gilroy/Gilroy-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-gilroy",
});
