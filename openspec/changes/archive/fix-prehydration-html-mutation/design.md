## Context

O `proposal.md` estabelece a causa e o tamanho: o script inline do failsafe escreve `class="js"` em `document.documentElement` durante o parse, e o React reclama ao hidratar porque a sua árvore não tem essa classe. Aviso de dev, não fatal, em toda carga.

O que restringe as soluções é uma tensão que não tem saída limpa:

```
  O script PRECISA correr antes da primeira pintura
            │  (senão `html:not(.js)` casa por um frame e o
            │   conteúdo pisca visível antes de animar)
            ▼
  Ele escreve em <html> antes de o React hidratar
            │
            ▼
  O React vê um atributo que a sua árvore não tem
            │
            ├──▶ reclama (o aviso)
            └──▶ NÃO corrige  ← e isto é essencial:
                                se corrigisse, `html:not(.js)`
                                voltaria a casar com o React vivo
                                e mataria todas as animações
```

O React já faz a coisa certa. O único problema é que ele avisa enquanto a faz.

## Goals / Non-Goals

**Goals:**

- Console sem erro de hidratação na carga normal da home.
- A marca escrita antes da hidratação continua no DOM, e a rede de segurança de visibilidade continua funcionando exatamente como hoje.
- A área que deixa de ser verificada pelo React fica enumerada, não implícita.

**Non-Goals:**

- Remover a mutação pré-hidratação. Avaliada e adiada — ver Decisões.
- Alterar o prazo do failsafe, o seletor da rede de segurança, ou o `HydrationSignal`.
- Qualquer efeito em produção. `suppressHydrationWarning` não muda o HTML emitido nem a árvore hidratada.

## Decisions

### 1. `suppressHydrationWarning` no `<html>`

A prop entra no elemento que o script muta, e só nele.

Foi verificado no código-fonte que ela cobre este caso específico, porque não era óbvio que cobriria. O aviso aqui é de **atributo extra** — presente no DOM, ausente nas props —, e não de valor divergente. São ramos diferentes no React. O ramo relevante:

```js
// react-dom-client.development.js:23614
0 < extraAttributes.size &&
  !0 !== props.suppressHydrationWarning &&
  warnForExtraAttributes(domElement, extraAttributes, serverDifferences);
```

A prop guarda `warnForExtraAttributes` diretamente. Confirmado, não presumido.

Duas propriedades da prop que decidem o desenho: ela é consultada nas props do **próprio** elemento, e não alcança descendentes. Isso a torna adequada — a área cega fica limitada aos atributos de `<html>`, hoje `lang`, `data-scroll-behavior` e `class`.

**Alternativa rejeitada: renderizar `className="js"` no servidor.** Faria o markup casar, e destruiria o mecanismo. `html:not(.js)` significa "o script não correu"; emiti-la do servidor faz a classe existir mesmo quando o script não corre, e a rede de segurança nunca mais dispara para quem está sem JavaScript — que é a população inteira que ela existe para proteger.

**Alternativa rejeitada: mover a marca para `<body>`.** Não resolve nada. `<body>` também é renderizado pelo React, com `className` dinâmico vindo das fontes, e a divergência apenas muda de endereço — para um elemento cuja área de supressão seria maior, não menor.

**Alternativa rejeitada: marcar por outro meio que não um atributo.** Qualquer sinal que o CSS consiga ler em `<html>` é um atributo — classe, `data-*`, `style` inline. Todos caem no mesmo ramo do React. Não há terceira via.

### 2. Remover a mutação fica registrado como alternativa, não como dívida

Existe uma solução que elimina a divergência em vez de silenciá-la, e ela é boa o bastante para merecer registro em vez de esquecimento.

O ramo `html:not(.js)` da rede de segurança cobre exatamente um cenário: o script inline não correu, isto é, JavaScript desabilitado. Os outros dois cenários — bundle bloqueado e hidratação falha — são cobertos pelo temporizador, que escreve `.reveal-failsafe`. E "JavaScript desabilitado" tem expressão em CSS que não exige script nenhum:

```html
<noscript><style>[data-reveal]{opacity:1!important;transform:none!important}</style></noscript>
```

Com isso o script deixaria de escrever `.js`, passaria a só agendar o temporizador, e `<html>` chegaria intocado à hidratação. A classe `.reveal-failsafe` entra em t=10 s, muito depois, onde mutação de DOM é rotina e não divergência.

`<noscript>` foi preferido a `@media (scripting: none)` na avaliação: mesma cobertura, suporte universal em vez de exigir Chrome 120+ / Safari 17+ / Firefox 113+. Numa rede de segurança contra texto invisível, deixar navegadores antigos de fora é justamente o tipo de troca que não se faz.

Por que não agora, mesmo sendo mais limpo:

- Alcança `globals.css`, `HydrationSignal`, o script inline e a spec `text-visibility-guarantees` — uma change inteira, não uma prop.
- Traz um risco que não se resolve sem navegador: com JavaScript ativo o browser trata o conteúdo de `<noscript>` como **texto**, enquanto a árvore do React quer um elemento. Hidratar isso exige `dangerouslySetInnerHTML` no `<noscript>` para o React não reconciliar os filhos. Trocar um aviso de hidratação por outro seria um resultado ruim, e a verificação não é possível neste ambiente.

Registrado aqui para que a próxima pessoa que olhar o aviso encontre a análise pronta em vez de refazê-la.

## Risks / Trade-offs

**A supressão esconde divergência futura nos atributos de `<html>`** → Mitigado por enumeração obrigatória na justificativa e no requisito de spec: quem adicionar um atributo a `<html>` encontra escrito, no ponto de uso, que ali o React não avisa mais. Não é mitigação forte — é a melhor disponível, e o requisito existe para que a fraqueza seja visível em vez de tácita.

**Suprimir um aviso pode virar hábito** → O requisito de spec restringe a permissão ao caso verificável de mutação pré-hidratação intencional, exige a supressão no elemento mutado e não em ancestral, e tem cenário explícito de que divergência não intencional em outros elementos continua reportada.

**A alternativa mais limpa fica na gaveta** → Aceito e datado. A decisão 2 registra a análise completa, incluindo por que `<noscript>` vence `@media (scripting: none)`, para que retomá-la custe pouco.

## Migration Plan

Uma prop e um comentário. Sem migração, sem coordenação de deploy, reverte por `git revert`.

A única ordenação que importa é de spec, não de código: esta change adiciona requisito a `hydration-integrity`, que ainda não existe em `openspec/specs/` porque `fix-reduced-motion-hydration` é quem a introduz. As duas arquivam em ordem, ou juntas.

## Open Questions

- **O aviso some de fato ao carregar a home em desenvolvimento?** A leitura do código-fonte do React fecha o caso em teoria — a prop guarda `warnForExtraAttributes`, que é o ramo exato deste aviso —, mas a confirmação é no navegador e não pode ser feita aqui.
- **Sobra algum outro aviso de hidratação depois deste?** Se sobrar, é terceira causa, independente das duas já caracterizadas, e merece investigação própria em vez de mais supressão.
