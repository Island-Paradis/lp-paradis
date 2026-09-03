// Quando é que um `url` authorado no Payload conta como destino.
//
// Existe porque "vazio" tem três formas neste projecto, e as três chegam do
// mesmo campo de texto:
//
//   `null`        o campo nunca foi tocado;
//   `""`          o campo foi limpo no admin — o Payload grava string vazia,
//                 não `null`, e é a razão de `textOr` existir em `cms-text.ts`;
//   `"#"`         o `defaultValue` que `collections/Hero.ts` dá aos campos
//                 `url`. Significa "ainda não authorado", e não "salta para o
//                 topo desta página".
//
// A terceira é a que não é óbvia, e é a que estava a acontecer de facto: no
// inventário desta change, `services.primaryCta`, `projects.primaryCta` e
// `Footer.cta.primaryButton` tinham todos `#`. Renderizá-los como âncora daria
// um botão que parece funcionar e salta para o topo — pior que o `<button>`
// inerte de hoje, porque promete e falha.
//
// **`#` sozinho, e não qualquer coisa que comece por `#`.** `#faqs` e
// `/#services` são destinos reais e são o que faz o menu funcionar. A diferença
// entre os dois casos é um fragmento com nome.
export function hasDestination(
  href: string | null | undefined,
): href is string {
  const value = href?.trim();
  return !!value && value !== "#";
}

// O `href` a passar ao `Button`, ou `undefined` para ele renderizar `<button>`.
//
// Devolver `undefined` e não `""` é o ponto todo: `<a href="">` recarrega a
// página corrente, que é um modo de falha silencioso — parece um link, age como
// um refresh.
export function ctaHref(href: string | null | undefined): string | undefined {
  return hasDestination(href) ? href : undefined;
}
