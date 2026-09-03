# client-bundle-budget Specification

## Purpose

O que a landing page tem permissão de enviar ao browser no carregamento inicial — proibição de barris não-tree-shakeable, formato e escopo dos arquivos de fonte, e política de carregamento de mídia pesada. Cobre a camada 1.

_Introduzida por `optimize-landing-performance`, sincronizada ao arquivar._

## Requirements

### Requirement: Bibliotecas de ícones não entram no bundle por barril

Nenhum módulo que chega ao cliente SHALL importar uma biblioteca de ícones como namespace (`import * as X from ...`) nem indexá-la por chave calculada em runtime (`X[nome]`). As duas coisas juntas tornam o tree-shaking impossível: o bundler não consegue provar quais exports são usados e retém o namespace inteiro.

Componentes que expõem um ícone como API SHALL recebê-lo já resolvido, como `React.ElementType`, e não por nome em string. A responsabilidade de importar o ícone específico passa para o call site, onde o import é estático e nomeado.

Isto vale independentemente de o pacote declarar `sideEffects: false`. Essa declaração autoriza o bundler a descartar exports não usados; ela não o ajuda a descobrir quais são, quando o acesso é dinâmico.

#### Scenario: Nenhum namespace import de ícones no código de cliente

- **WHEN** o codebase é varrido por `import * as` originando de um pacote de ícones, em qualquer arquivo alcançável a partir de um `"use client"`
- **THEN** nenhuma ocorrência é encontrada

#### Scenario: A prop de ícone carrega o componente, não o nome

- **WHEN** um componente compartilhado (`Button`, `Badge`) aceita um ícone
- **THEN** o tipo da prop é um componente React, e o valor passado no call site vem de um import nomeado estático

#### Scenario: O peso da biblioteca de ícones no bundle é proporcional ao uso

- **WHEN** o bundle de produção é analisado após a mudança
- **THEN** a contribuição do pacote de ícones corresponde apenas aos ícones efetivamente referenciados, e não à biblioteca inteira

### Requirement: Arquivos de fonte são WOFF2 e restritos ao que é usado

Os arquivos de fonte servidos ao browser SHALL estar em WOFF2. `next/font/local` não transcodifica — ele serve o arquivo declarado como está —, então declarar TTF significa entregar TTF.

A declaração de fonte SHALL incluir apenas os pesos e estilos efetivamente referenciados pelo CSS do site. Pesos declarados e nunca usados são peso morto no repositório e ruído na declaração, mesmo quando o browser não os baixa.

#### Scenario: Formato dos arquivos entregues

- **WHEN** os arquivos de fonte de `src/fonts/` são inspecionados
- **THEN** todos estão em WOFF2, e nenhum TTF permanece no caminho de build

#### Scenario: Escopo dos pesos declarados

- **WHEN** a declaração de `localFont` é comparada com os usos de `font-gilroy` combinados com classes de peso no codebase
- **THEN** cada peso declarado tem pelo menos um uso correspondente, e cada uso tem um peso declarado correspondente

#### Scenario: Nenhuma regressão de renderização tipográfica

- **WHEN** as páginas são comparadas visualmente antes e depois da conversão, nos dois locales
- **THEN** o desenho das letras, as métricas e o espaçamento são equivalentes, sem deslocamento de layout introduzido pela troca de formato

### Requirement: Mídia pesada não é buscada onde não é exibida

Um elemento de mídia que só é visível a partir de um determinado breakpoint SHALL NOT ser buscado pelo browser abaixo desse breakpoint. Esconder o wrapper com `display: none` não é garantia suficiente: um `<video autoplay>` presente no DOM pode ser buscado mesmo invisível, e o alvo desta change é justamente o aparelho onde esses bytes custam mais.

Todo `<video>` de decoração SHALL declarar `poster` e uma política de `preload` explícita, para que o primeiro frame não dependa da chegada do arquivo.

#### Scenario: Vídeo de fundo em viewport móvel

- **WHEN** a home é carregada em viewport abaixo de 768px, com o painel de rede aberto
- **THEN** o arquivo de vídeo do bloco de serviços não aparece entre as requisições

#### Scenario: Vídeo de fundo em viewport desktop

- **WHEN** a home é carregada a partir de 768px
- **THEN** o `poster` é pintado antes de o vídeo chegar, e o vídeo então reproduz em loop como hoje

### Requirement: Redução de bytes não altera o resultado visual

Nenhum item desta capability SHALL alterar o que o usuário vê. Ícones, tipografia e o bloco de vídeo permanecem visualmente idênticos; o que muda é como chegam.

Este requisito existe para tornar explícita a diferença entre esta change e a alternativa que ela rejeita — cortar elementos para ganhar performance. Uma otimização que degrada o resultado visual falha este requisito, ainda que melhore a métrica.

#### Scenario: Comparação visual antes e depois

- **WHEN** capturas das seções afetadas são comparadas entre a base e a branch, no mesmo viewport e locale
- **THEN** não há diferença perceptível além do `poster` do vídeo, que só aparece antes de um frame que antes não existia

### Requirement: O ganho é medido no perfil de referência

O efeito de cada item SHALL ser medido em um perfil declarado — **Android médio, CPU throttled 4x, rede 4G** — e não justificado apenas por raciocínio sobre o código.

Uma medida de baseline SHALL ser registrada antes da primeira mudança, e a mesma medida repetida depois. Sem baseline, "ficou mais rápido" não é verificável.

#### Scenario: Baseline registrada antes das mudanças

- **WHEN** a implementação começa
- **THEN** existe uma medida registrada de tamanho de bundle e de LCP/TBT no perfil de referência, tirada da branch base

#### Scenario: Ganho verificado após as mudanças

- **WHEN** a implementação termina
- **THEN** a mesma medida foi repetida, e a diferença está registrada por item, permitindo identificar qualquer item que não tenha entregue ganho
