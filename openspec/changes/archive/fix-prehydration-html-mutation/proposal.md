## Why

O console emite um erro de hidratação em toda carga da home, e a causa é um mecanismo do próprio projeto funcionando como projetado.

```
A tree hydrated but some attributes of the server rendered HTML
didn't match the client properties. This won't be patched up.

  <html lang="en" data-scroll-behavior="smooth"
-       className="js"
  >
```

Na legenda do React, `-` é o DOM existente. O DOM tem `class="js"`; a árvore do React não. Quem escreveu a classe foi o script inline do failsafe (`layout.tsx`), que roda durante o parse — antes da hidratação, que é exatamente o requisito que ele existe para cumprir:

```js
(function(){var d=document.documentElement;d.classList.add('js'); …})()
```

Ou seja: o DOM está adiantado em relação à árvore do React **de propósito**, e o React reclama disso. Não há defeito de comportamento a corrigir — há um aviso a calar de forma declarada.

Três fatos delimitam o tamanho do problema, e todos foram verificados no código-fonte do React em vez de assumidos:

1. **É apenas dev, e não é fatal.** A mensagem vem de `emitPendingHydrationWarnings` (`react-dom-client.development.js:5718`), um `console.error` puro, em caminho separado de `queueHydrationError` e `upgradeHydrationErrorsToRecoverable`. Não há re-renderização de raiz. Nada quebra.
2. **"This won't be patched up" é o comportamento desejado.** O React deixa `class="js"` no DOM em vez de removê-la. Se ele "corrigisse", a rede de segurança de visibilidade quebraria — `html:not(.js)` voltaria a casar com o React vivo e desligaria todas as animações.
3. **Acontece em toda carga, sem depender de preferência nenhuma.** Diferente da divergência que `fix-reduced-motion-hydration` corrigiu, esta não tem gatilho: o script sempre roda, a classe sempre entra.

Por que aparece agora: estava encoberta. Enquanto `useReducedMotion()` fazia o React descartar a hidratação e re-renderizar a raiz, o erro mais barulhento (#418) tomava o lugar deste. Corrigido aquele, este ficou visível. É a segunda causa que a tarefa 1.2 daquela change existia para detectar — e a detecção funcionou.

O custo de deixar como está não é funcional, é de sinal: um erro de hidratação permanente no console treina quem desenvolve a ignorar erros de hidratação, e o próximo — real — chega no meio do ruído. É o mesmo argumento que `hydration-integrity` já faz sobre a rede de segurança absorver defeitos conhecidos.

## What Changes

- **`<html>` passa a declarar `suppressHydrationWarning`.** É a válvula de escape que o React oferece para exatamente este caso: "o DOM diverge da minha árvore aqui, e é intencional". Verificado no código-fonte (`react-dom-client.development.js:23614`) que a prop de fato cobre o caso — ela guarda `warnForExtraAttributes`, que é o ramo de atributo presente no DOM e ausente nas props, e não apenas o de valores diferentes.
- **A supressão fica documentada no ponto de uso**, com o que ela cobre, o que ela esconde, e o que fazer se um atributo novo entrar em `<html>`.
- **A invariante ganha um requisito.** `hydration-integrity` passa a tratar mutação intencional pré-hidratação como caso previsto e regulado, em vez de omisso: onde ela existir, a supressão SHALL ser localizada no elemento mutado e justificada.

Não faz parte do escopo: remover a mutação. Foi considerada e descartada nesta rodada — trocar `html:not(.js)` por `<noscript><style>` eliminaria a divergência na origem em vez de silenciá-la, mas mexe na rede de segurança de visibilidade, no `HydrationSignal` e na spec `text-visibility-guarantees`, e traz um risco próprio que não se resolve sem navegador (o React hidratando `<noscript>` precisa de `dangerouslySetInnerHTML` para não criar uma divergência nova). Fica registrado como alternativa avaliada, não como dívida esquecida.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `hydration-integrity`: ganha um requisito sobre mutação intencional do DOM antes da hidratação — quando é legítima, e o que precisa acompanhá-la para não virar supressão genérica.

## Impact

**Código afetado**

- `src/app/(app)/[locale]/layout.tsx` — uma prop no `<html>`, mais o comentário que a justifica. É a mudança inteira.

**Coordenação**

Esta change adiciona requisito a `hydration-integrity`, capability que **ainda não existe** em `openspec/specs/` — está sendo introduzida por `fix-reduced-motion-hydration`, em implementação. As duas precisam ser arquivadas em ordem, ou juntas. A dependência é só de spec: o código das duas não se sobrepõe, e esta aqui toca um arquivo que aquela não toca.

**Sem impacto**

Comportamento em runtime, produção, build, Payload, i18n. `suppressHydrationWarning` não tem efeito fora do desenvolvimento — não altera o HTML emitido nem a árvore hidratada, apenas o que o React relata.

**Risco principal**

A supressão esconde divergências futuras nos atributos do próprio `<html>`. A superfície é pequena e enumerável — hoje `lang`, `data-scroll-behavior` e `class` — e a prop não alcança descendentes: o React a consulta por elemento, nas props daquele elemento. Ainda assim, o risco é real e assimétrico: um atributo novo em `<html>` que divirja passaria despercebido justamente porque o mecanismo que o denunciaria está desligado. Por isso o requisito de spec exige que a justificativa enumere o que está sob a supressão, e não apenas que ela existe.
