# text-visibility-guarantees Specification

## Purpose

A invariante transversal de que nenhum texto renderizado pode depender, para ser visto, de um mecanismo cujo estado de falha seja invisível. Cobre visibilidade por cor (gradiente recortado em texto), recorte por container (`overflow-hidden`, `clip-path`, alturas fixas) e o comportamento sem JavaScript.

_Introduzida por `prevent-invisible-text`, sincronizada ao arquivar._

## Requirements

### Requirement: Nenhum texto depende de JavaScript para ser legível

Todo texto renderizado nas páginas públicas SHALL ser legível quando o JavaScript não executa. Isso cobre os três casos em que o React não fica vivo: JavaScript desabilitado no navegador, falha no carregamento do bundle, e falha de hidratação com o bundle já carregado.

"Legível" significa opacidade total, sem deslocamento que o tire de um recorte, e com contraste suficiente contra o próprio fundo. A ausência de animação neste estado é esperada e aceitável.

#### Scenario: JavaScript desabilitado no navegador

- **WHEN** a home é carregada com o JavaScript desabilitado nas configurações do navegador
- **THEN** todo texto presente no DOM está visível na tela: títulos, subtítulos, descrições de cards, rótulos de CTA, perguntas e respostas do FAQ, e depoimentos

#### Scenario: Bundle de JavaScript não carrega

- **WHEN** a home é carregada e todas as requisições a arquivos `.js` são bloqueadas
- **THEN** todo texto presente no DOM está visível na tela

#### Scenario: Hidratação do React falha

- **WHEN** a home é carregada, o bundle de JavaScript carrega normalmente, mas o React não conclui a hidratação
- **THEN** todo texto presente no DOM se torna visível dentro de um limite de tempo definido, sem exigir interação do usuário

#### Scenario: Hidratação conclui depois do limite de tempo

- **WHEN** o mecanismo de segurança já forçou a visibilidade e o React conclui a hidratação em seguida
- **THEN** o mecanismo é desfeito e as animações voltam a funcionar, sem exigir recarregamento da página

#### Scenario: Hidratação bem-sucedida não aciona o mecanismo de segurança

- **WHEN** a home é carregada e o React hidrata normalmente
- **THEN** nenhuma regra de segurança de visibilidade tem efeito sobre a página, e as animações de entrada ocorrem exatamente como ocorreriam sem o mecanismo

#### Scenario: Ausência de flash de conteúdo

- **WHEN** a home é carregada com JavaScript habilitado e o React hidrata normalmente
- **THEN** nenhum elemento animado é pintado em seu estado final antes de ser pintado em seu estado inicial

### Requirement: Visibilidade de texto não depende exclusivamente de cor

Nenhum texto SHALL ter sua visibilidade condicionada unicamente a uma técnica de pintura que possa não ser suportada ou não ser aplicada. Onde o texto for pintado por gradiente recortado (`background-clip: text`), uma cor sólida legível SHALL ser a declaração base, e a técnica de gradiente SHALL ser aplicada apenas dentro de uma consulta de suporte que confirme a capacidade.

A ordem das declarações SHALL colocar a cor sólida antes do gradiente, de modo que qualquer falha de suporte ou de aplicação resulte na cor sólida.

#### Scenario: Gradiente recortado sem suporte no navegador

- **WHEN** a página é renderizada em um navegador que não suporta `background-clip: text`
- **THEN** o título afetado é exibido na cor sólida de base, com contraste suficiente contra o fundo

#### Scenario: Gradiente recortado com suporte no navegador

- **WHEN** a página é renderizada em um navegador que suporta `background-clip: text`
- **THEN** o título é exibido com o gradiente, visualmente idêntico ao comportamento anterior à mudança

#### Scenario: Transparência não é herdada por elementos filhos

- **WHEN** um elemento que usa gradiente recortado contém elementos filhos
- **THEN** os filhos não herdam cor transparente, e seu conteúdo permanece visível

### Requirement: Containers que recortam não podem amputar texto

Em um container que recorta o transbordo — via `overflow: hidden`, `clip-path`, ou ambos — e cuja altura seja determinada externamente ao seu conteúdo, nenhum elemento filho SHALL declarar uma altura que consuma o espaço destinado a elementos irmãos que contenham texto.

Especificamente, um filho de um container flex de altura definida não SHALL declarar `height: 100%` quando existirem irmãos com conteúdo textual.

#### Scenario: Header de célula não reivindica a altura do container

- **WHEN** uma célula de serviço é renderizada com altura definida pelo grid e recorte de transbordo ativo
- **THEN** o bloco de ícone e título ocupa apenas a altura do seu próprio conteúdo, e a descrição recebe o espaço restante

#### Scenario: Descrição permanece visível na célula

- **WHEN** uma célula de serviço é renderizada em qualquer viewport a partir de 768px
- **THEN** a descrição do serviço está presente e visível dentro dos limites da célula

### Requirement: Aninhamento HTML válido em torno de texto

Elementos de bloco que contêm texto — em particular `<p>` — não SHALL ser aninhados dentro de elementos inline como `<span>`. Onde um wrapper for necessário para layout ou para receber uma animação, ele SHALL ser um elemento de bloco.

#### Scenario: Sem avisos de aninhamento inválido

- **WHEN** a home é renderizada em desenvolvimento e o console do navegador é inspecionado
- **THEN** não há avisos de `validateDOMNesting` relacionados a elementos de bloco dentro de elementos inline

### Requirement: Código de depuração ausente do caminho de renderização

Nenhuma instrução de log de depuração SHALL permanecer nos componentes de página após a conclusão da investigação que a motivou.

#### Scenario: Renderização do servidor sem log de depuração

- **WHEN** a home é requisitada e a saída do servidor de desenvolvimento é observada
- **THEN** nenhum valor de conteúdo do CMS é impresso no terminal
