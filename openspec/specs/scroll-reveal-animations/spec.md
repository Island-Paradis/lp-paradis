# scroll-reveal-animations Specification

## Purpose

O contrato das primitivas `Reveal` e `TextReveal` — qual é o estado renderizado no servidor, quando o estado oculto pode ser aplicado, quando a revelação é forçada, se a animação replica ao sair da viewport, e como `prefers-reduced-motion` é respeitado.

_Introduzida por `prevent-invisible-text`, sincronizada ao arquivar._

## Requirements

### Requirement: O elemento observado não pode ser recortado por um ancestral

Nenhuma primitiva de revelação SHALL observar, para decidir a entrada em viewport, um elemento que esteja recortado por um ancestral que esconde o transbordo. O elemento observado SHALL ser o próprio recorte, ou um ancestral dele.

O `IntersectionObserver` calcula a interseção recortando pelo `overflow` dos ancestrais. Observar um elemento deslocado para fora da sua máscara produz um deadlock: ele nunca é relatado como intersectando, logo nunca é revelado, logo nunca sai de fora da máscara. Com revelação de disparo único, o estado é permanente e independe do viewport.

#### Scenario: Palavra mascarada é revelada

- **WHEN** um título renderizado por `TextReveal` está inteiramente dentro da viewport, com cada palavra deslocada para fora da sua máscara `overflow-hidden`
- **THEN** as palavras são reveladas e assumem deslocamento nulo

#### Scenario: Observador não é o elemento deslocado

- **WHEN** a implementação de `TextReveal` é inspecionada
- **THEN** o elemento que carrega a configuração de viewport é a máscara, e o elemento que carrega o deslocamento é descendente dela

### Requirement: Revelação de disparo único não pode usar margem negativa

Uma primitiva cuja revelação seja de disparo único SHALL usar um gatilho de interseção sem margem negativa e com limiar zero, de modo que qualquer parte do elemento visível na viewport revele o elemento.

Uma margem negativa encolhe a raiz do observer e cria faixas em que um elemento pode estar visível na tela sem nunca ser relatado como intersectando. As duas propriedades são acopladas: essa zona morta só é perigosa junto com disparo único, porque só aí ela é permanente. Sem disparo único, o observer reavalia a cada rolagem e a condição se desfaz sozinha.

Uma primitiva que reanima a cada entrada SHALL, portanto, poder usar margem negativa.

#### Scenario: Título mascarado no fim do documento é revelado

- **WHEN** o último título renderizado por `TextReveal` permanece inteiramente dentro dos 80px inferiores da viewport e a página não pode rolar mais para baixo
- **THEN** o título é revelado

#### Scenario: Título mascarado no topo da viewport é revelado

- **WHEN** um título renderizado por `TextReveal` permanece inteiramente dentro dos 80px superiores da viewport e a página não pode rolar mais para cima
- **THEN** o título é revelado

#### Scenario: Configuração coerente com o modo de disparo

- **WHEN** as duas primitivas são inspecionadas
- **THEN** a que usa disparo único não declara margem negativa, e a que reanima pode declará-la

### Requirement: Blocos reanimam a cada entrada na viewport

`Reveal` SHALL reanimar sempre que o elemento entra na viewport, revertendo ao estado oculto ao sair — o comportamento que a primitiva já tinha e que dá ao site sua identidade de scroll.

Uma versão anterior desta change trocou esse comportamento por disparo único, em nome da robustez. A troca foi revertida: a rede de segurança de visibilidade já cobre o caso grave — o React não estar vivo — e o risco residual que o disparo único cobria não justifica abrir mão do replay em toda a página.

O disparo único permanece em `TextReveal`, onde sempre existiu.

#### Scenario: Bloco reverte ao sair da viewport

- **WHEN** um bloco revelado sai completamente da viewport por rolagem
- **THEN** o bloco retorna ao estado oculto

#### Scenario: Bloco reanima ao retornar

- **WHEN** o usuário rola de volta até um bloco já visto
- **THEN** a animação de entrada é executada novamente

#### Scenario: Elemento dentro da viewport está sempre visível

- **WHEN** a rolagem para em qualquer posição da página, com o React vivo
- **THEN** todo elemento animado inteiramente dentro da viewport está com opacidade total

### Requirement: Elementos animados são identificáveis por marcação

Todo elemento cujo estado inicial de animação seja invisível SHALL carregar um atributo de dados que permita a uma regra de CSS alcançá-lo e forçar sua visibilidade.

Isso cobre os elementos produzidos por `Reveal`, cada span de palavra produzido por `TextReveal`, e os elementos animados por variants próprios fora das primitivas — incluindo o título, a descrição e o grupo de CTAs do Hero, que animam no mount sem observer e compartilham o mesmo estado de falha.

#### Scenario: Elementos das primitivas são marcados

- **WHEN** a home é renderizada e o DOM é inspecionado
- **THEN** todo elemento com estado inicial de opacidade zero ou deslocamento que o retire de um recorte carrega o atributo de marcação

#### Scenario: Palavras do TextReveal são marcadas individualmente

- **WHEN** um título renderizado por `TextReveal` é inspecionado
- **THEN** cada span de palavra que carrega o deslocamento inicial está marcado

#### Scenario: Animações fora das primitivas são marcadas

- **WHEN** o Hero é inspecionado
- **THEN** os elementos animados por seus variants próprios estão marcados, apesar de não usarem as primitivas

### Requirement: Preferência por movimento reduzido é respeitada sem custo de visibilidade

Quando `prefers-reduced-motion` estiver ativo, as primitivas SHALL usar um caminho de animação reduzido, e esse caminho SHALL estar sujeito às mesmas garantias de visibilidade dos demais.

O caminho de movimento reduzido não SHALL usar máscara de recorte com deslocamento, apenas transição de opacidade.

#### Scenario: Movimento reduzido com JavaScript ativo

- **WHEN** a home é carregada com `prefers-reduced-motion: reduce` e o React hidrata normalmente
- **THEN** os textos aparecem sem deslocamento e todo o conteúdo textual é legível

#### Scenario: Movimento reduzido sem JavaScript

- **WHEN** a home é carregada com `prefers-reduced-motion: reduce` e o JavaScript não executa
- **THEN** todo o conteúdo textual é legível

#### Scenario: Sinal de vivacidade do React sob movimento reduzido

- **WHEN** a home é carregada com `prefers-reduced-motion: reduce` e o React hidrata normalmente
- **THEN** o sinal de que o React está vivo é emitido, e o mecanismo de segurança de visibilidade não é acionado

### Requirement: Animação no caminho feliz permanece inalterada

Excetuadas as mudanças de gatilho e de replay definidas nos requisitos acima, as animações de entrada SHALL permanecer visualmente idênticas ao comportamento anterior à mudança: mesmas durações, mesmas curvas de easing, mesmo stagger, mesmas direções e mesmas distâncias de deslocamento.

#### Scenario: Parâmetros de animação preservados

- **WHEN** as primitivas são comparadas com sua versão anterior à mudança
- **THEN** duração, easing, stagger e distância de deslocamento são os mesmos

#### Scenario: Revelação por palavra preservada

- **WHEN** um título renderizado por `TextReveal` é revelado com JavaScript ativo
- **THEN** as palavras sobem de dentro da máscara em sequência escalonada, como antes da mudança
