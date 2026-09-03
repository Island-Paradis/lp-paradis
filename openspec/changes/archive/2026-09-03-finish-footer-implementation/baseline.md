# Linha de base — finish-footer-implementation

Medido em 2026-09-03, antes de qualquer alteração de código ou schema.

## Bundle de cliente (task 1.3)

`npm run build` no Next 16.3.2 com Turbopack **não imprime a tabela de first-load JS**
por rota. O número que o design pedia não existe neste output. Substituto usado, e
declarado como substituto: bytes de JS em `.next/static` após um build limpo.

| Métrica | Antes |
|---|---|
| Chunks `.js` em `.next/static` | 72 |
| Bytes de JS somados | 3.589.441 |
| `du -sk .next/static` | 4692 KB |

Comparável antes/depois pelo mesmo comando. Não é equivalente a first-load JS por
rota — não distingue o que a rota `/[locale]` de fato carrega do que existe no
diretório. Serve para detectar entrada de namespace de ícones, que é o que o
requisito de fechamento persegue; não serve para afirmar "a rota ficou X KB maior".

## Estado authorado do global `footer` (task 1.2)

Lido em modo somente-leitura direto do Postgres. Nenhuma escrita.

### Campos não localizados (`footer`)

| Coluna | Valor |
|---|---|
| `logo_id` | 4 |
| `cta_primary_button_href` | `#` |
| `cta_outline_button_href` | `#` |

### Campos localizados (`footer_locales`)

**Existe uma única linha, `_locale = "en"`. Não existe linha `pt`.**

| Campo | `en` | `pt` |
|---|---|---|
| `tagline` | "Because we were born into this world" | ausente |
| `cta_heading` | **null** | ausente |
| `cta_primary_button_label` | "Get Quote  - For Free" (dois espaços) | ausente |
| `cta_outline_button_label` | "Schedule a Call" | ausente |
| `copyright_text` | "Paradis.Labs - All rights reserved." | ausente |

### Links (`footer_link_groups_links`)

| Grupo | Rótulo (en) | `href` | `isExternal` |
|---|---|---|---|
| Quick Links | Home | `/` | `false` |
| Quick Links | Products | `/#products` | `false` |
| Quick Links | Services | `/#services` | `false` |
| Quick Links | Kitenda | `https://kitenda.paradis.host/` | **`true`** |
| Quick Links | Ficha Segura | `https://ficha-segura.paradis.host/` | **`true`** |
| Company | Company | `#` | `false` |
| Company | Members | `#` | `false` |
| Company | Contacts | `#` | `false` |
| Products | Kitenda | `https://kitenda.paradis.host/` | **`true`** |
| Products | Ficha Segura | `https://ficha-segura.paradis.host/` | **`true`** |

Nenhum link tem `name` em `pt`.

## Consequências para a change

Cinco achados alteram premissas escritas antes desta leitura.

1. **`isExternal` já está authorado, e corretamente.** O design afirmava que o flag
   de `Kitenda`/`DP Angola` não estava marcado e derivava disso o risco central da
   change mais a ordenação "conteúdo antes de código". **A afirmação estava errada.**
   Os dois externos são `true`, os seis internos são `false`. A task 3.1 já está
   satisfeita em dado, o grupo 6 não está bloqueado, e o risco de "os dois links
   deixam de abrir em nova aba" não se materializa.

2. **`cta_heading` é `null`.** O fallback de D7 é exercitado imediatamente, não é
   hipotético: assim que a leitura do global substituir o literal, o heading passa a
   vir do fallback declarado. Sem D7, o bloco do CTA renderizaria sem título.

3. **Os dois `href` de CTA valem `#`.** Os CTAs viram âncoras — o requisito é
   cumprido — mas âncoras que não levam a lugar nenhum. É pendência de conteúdo, não
   de código, e não é resolvível aqui.

4. **Não existe locale `pt` para nada no footer.** Com `fallback: true` e
   `defaultLocale: "en"` em `payload.config.ts`, `/pt` recebe os valores em inglês por
   fallback do Payload. Depois desta change o footer em `/pt` continua em inglês — mas
   por conteúdo não traduzido, e não porque o código fixa a string. É a distinção que
   o proposal declara e o limite do que esta change pode fazer.

5. **O mockup está desatualizado quanto ao conteúdo.** Ele mostra `DP Angola`; o banco
   tem `Ficha Segura` no mesmo lugar, nos dois grupos. O código não trata nome de link
   de forma especial, então isso não afeta a implementação — mas qualquer comparação
   visual com o mockup vai divergir nesses dois rótulos, e a divergência é do mockup.

## Não capturado

- **Task 1.1 (capturas de tela).** Não feito. Exigiria dirigir um browser; a
  verificação desta change foi decidida como código + build. Sem imagem de referência,
  o non-goal "sem redesenho" é verificado por leitura do diff de classes utilitárias,
  não por comparação de pixels.
