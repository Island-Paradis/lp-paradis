## 1. Aplicar a supressão

- [x] 1.1 Adicionar `suppressHydrationWarning` ao `<html>` em `src/app/(app)/[locale]/layout.tsx`
- [x] 1.2 Comentar no ponto de uso: que a mutação é do script inline do failsafe e é intencional; que o React deixar `class="js"` no DOM ("won't be patched up") é o comportamento DESEJADO, porque "corrigir" faria `html:not(.js)` casar com o React vivo e desligar todas as animações; e que a prop é consultada nas props do próprio elemento e não alcança descendentes
- [x] 1.3 Enumerar no mesmo comentário quais atributos de `<html>` passam a ficar fora da verificação do React — hoje `lang`, `data-scroll-behavior` e `class` — e instruir quem adicionar um atributo novo a conferi-lo à mão

## 2. Verificação

- [ ] 2.1 Carregar a home em desenvolvimento e confirmar que o erro `A tree hydrated but some attributes of the server rendered HTML didn't match the client properties` não aparece mais
- [ ] 2.2 Confirmar no inspetor que `<html>` continua com `class="js"` depois da hidratação — a supressão cala o aviso, não deve alterar o DOM
- [ ] 2.3 Confirmar que a rede de segurança de visibilidade continua desligada no caminho feliz: nenhum `[data-reveal]` com `opacity: 1 !important` aplicado, e as animações de entrada rodando normalmente
- [ ] 2.4 Carregar com o JavaScript desabilitado e confirmar que todo o texto continua legível — o ramo `html:not(.js)` precisa seguir intacto
- [ ] 2.5 Registrar se sobra qualquer outro aviso de hidratação no console; se sobrar, é terceira causa e não se resolve com mais supressão (Open Question do design)
- [x] 2.6 Rodar `npm run lint` e `npm run build`

  `npm run build` passa. `npm run lint` reporta 45 erros e 15 avisos **pré-existentes**, todos em arquivos que esta change não toca (ordenação de imports em `src/service/`, entre outros, vindos do trabalho não commitado na árvore). `layout.tsx` está limpo.


## 3. Pendência de decisão

- [ ] 3.1 Resolver o conflito entre o requisito de spec (justificativa e enumeração no ponto de uso) e a ausência de comentários em `layout.tsx`

  As tarefas 1.2 e 1.3 foram escritas e o comentário foi removido do arquivo. `layout.tsx` é o único arquivo desta linha de trabalho sem comentários — os demais mantiveram os seus (por exemplo `parallax.tsx` com 64 linhas de comentário, `SmoothScroll` com 61). O requisito "Mutação intencional do DOM antes da hidratação é declarada no elemento mutado" exige que a justificativa enumere os atributos cobertos; sem comentário no arquivo, o requisito não é satisfeito onde ele pede. Saídas possíveis: relaxar o requisito para aceitar a justificativa fora do código (aqui, no design), ou aceitar um comentário mínimo apenas neste ponto.
