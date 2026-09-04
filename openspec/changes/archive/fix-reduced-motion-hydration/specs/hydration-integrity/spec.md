## ADDED Requirements

### Requirement: Nenhuma renderização consulta o ambiente do navegador

Nenhum componente ou hook SHALL ler, durante a renderização, um valor que só existe no navegador e que possa diferir entre servidor e cliente. Isso cobre media queries (`matchMedia`, incluindo `prefers-reduced-motion`, `pointer` e larguras de viewport), dimensões de janela ou elemento, `navigator`, `localStorage` e `sessionStorage`, data e hora locais, e fuso horário.

"Durante a renderização" inclui o corpo do componente, inicializadores de `useState`, e qualquer função chamada por esses. A restrição não depende de o valor ser lido diretamente: um hook de terceiro que faça a leitura em seu próprio inicializador de `useState` está igualmente proibido no caminho de renderização, e SHALL ser substituído por um equivalente do projeto que respeite esta invariante.

A consequência que o requisito existe para garantir, e que prevalece sobre a letra dele: o HTML emitido pelo servidor e a árvore pedida pela primeira renderização do cliente SHALL ser idênticos em forma de DOM, atributos e `style` inline, para qualquer combinação de preferências e capacidades do dispositivo.

Onde uma leitura em tempo de renderização for provadamente incapaz de produzir DOM diferente, e removê-la custar mais do que mantê-la, ela SHALL ser tratada pela exceção definida no requisito seguinte — que exige prova, registro e supressão localizada, e não é permissão para julgar caso a caso sem eles.

#### Scenario: Preferência de movimento reduzido não altera o markup inicial

- **WHEN** a home é carregada com `prefers-reduced-motion: reduce` ativo
- **THEN** o HTML entregue pelo servidor é idêntico ao entregue com a preferência desativada, e a primeira renderização do cliente não pede nenhuma alteração de forma de DOM, atributo ou `style` inline

#### Scenario: Hidratação sem erro sob movimento reduzido

- **WHEN** a home é carregada com `prefers-reduced-motion: reduce` ativo e o bundle carrega normalmente
- **THEN** o console do navegador não registra erro de divergência de hidratação

#### Scenario: Hidratação sem erro sob movimento normal

- **WHEN** a home é carregada sem `prefers-reduced-motion: reduce` e o bundle carrega normalmente
- **THEN** o console do navegador não registra erro de divergência de hidratação

#### Scenario: Nenhuma leitura de ambiente no caminho de renderização

- **WHEN** os componentes e hooks de cliente em `src/` são inspecionados
- **THEN** nenhuma leitura de media query, dimensão, `navigator`, armazenamento ou hora local ocorre no corpo de renderização ou em inicializador de `useState`, salvo onde a exceção do requisito seguinte for satisfeita com prova, registro e supressão localizada

### Requirement: Consultar o ambiente exige o padrão de estado mais efeito

Todo valor proveniente do ambiente do navegador SHALL ser exposto à renderização por estado do React inicializado com um valor neutro, atualizado depois da montagem.

O valor neutro SHALL ser aquele que o servidor assume, de modo que a primeira renderização do cliente reproduza o servidor por construção e não por coincidência. Onde o ambiente puder mudar durante a vida da página — o usuário alterar a preferência do sistema, conectar um dispositivo de entrada, redimensionar a janela — a assinatura da mudança SHALL ser estabelecida, e não apenas uma leitura única na montagem.

Este padrão SHALL valer inclusive quando o valor não altere markup, com uma única exceção, e a exceção SHALL ser expressa como requisito e não tolerada como omissão: adiar a verdade para depois da montagem SHALL NOT ser aplicado onde a mudança do valor trocaria o **tipo** do elemento naquela posição da árvore. Trocar o tipo faz o React desmontar a subárvore inteira, então o remédio custaria uma remontagem de conteúdo a cada carga — defeito maior que a divergência que ele corrige, e que só atinge quem tem a preferência ativa.

Onde essa exceção valer, três coisas SHALL estar presentes juntas: prova de que os braços da ramificação emitem o mesmo DOM, logo não há divergência a corrigir; registro de qual detalhe da dependência sustenta essa prova, para que a exceção morra se o detalhe mudar; e supressão localizada e justificada da regra de lint que aplica esta capability.

#### Scenario: Valor neutro reproduz o servidor

- **WHEN** um hook de ambiente é chamado na primeira renderização do cliente
- **THEN** ele devolve o mesmo valor que devolveu no servidor, antes de qualquer efeito ter corrido

#### Scenario: Mudança de preferência em tempo de execução é observada

- **WHEN** a página está aberta e o usuário altera a preferência de movimento reduzido nas configurações do sistema
- **THEN** os componentes que dependem dela reagem sem exigir recarregamento da página

#### Scenario: Padrão aplicado a portões de comportamento

- **WHEN** um valor de ambiente serve apenas para habilitar ou desabilitar uma interação, sem afetar o markup
- **THEN** ele ainda é obtido pelo padrão de estado mais efeito

#### Scenario: Exceção onde adiar a verdade remontaria a subárvore

- **WHEN** uma ramificação condicionada a valor de ambiente troca o tipo do elemento naquela posição da árvore, e os dois braços emitem o mesmo DOM
- **THEN** a leitura permanece em tempo de renderização, acompanhada da prova de que não há divergência, do detalhe de dependência que sustenta essa prova, e da supressão justificada da regra de lint

#### Scenario: Exceção não se estende por semelhança

- **WHEN** uma segunda ramificação condicionada a ambiente é encontrada e os seus braços emitem DOM diferente
- **THEN** ela não se beneficia da exceção, independentemente de quanto se pareça com o caso já excetuado

### Requirement: Preferências que alteram apenas apresentação são expressas em CSS

Quando uma preferência do usuário puder ser atendida sem alterar a árvore renderizada, ela SHALL ser expressa em CSS por media query, e não por ramificação em JavaScript.

Onde a regra de CSS precisar vencer um `style` inline emitido pelo sistema de animação, `!important` SHALL ser usado, e a declaração SHALL registrar que vencer o inline é o mecanismo e não um acidente.

O seletor de uma regra dessas SHALL ser delimitado por um marcador de dados cuja semântica corresponda ao que a regra faz. Um marcador existente não SHALL ser reaproveitado quando seu significado documentado for outro, porque isso o sujeita a todas as demais regras que o alcançam.

#### Scenario: Deslocamento neutralizado sem ramificar em JavaScript

- **WHEN** a home é carregada com `prefers-reduced-motion: reduce` ativo e o React hidrata normalmente
- **THEN** os elementos animados aparecem sem deslocamento, e nenhuma decisão de renderização consultou a preferência

#### Scenario: Marcador com semântica própria

- **WHEN** os marcadores de dados usados pelas regras de movimento reduzido são inspecionados
- **THEN** cada marcador tem significado declarado, e nenhum elemento carrega um marcador cujo significado documentado não se aplique a ele

#### Scenario: Caminho de movimento completo intacto

- **WHEN** a home é carregada sem `prefers-reduced-motion: reduce`
- **THEN** nenhuma regra de movimento reduzido tem efeito, e as animações ocorrem exatamente como ocorreriam sem a mudança

### Requirement: A rede de segurança de visibilidade não compensa divergências conhecidas

Nenhum mecanismo da rede de segurança de visibilidade SHALL existir para compensar uma divergência de hidratação conhecida e corrigível no código do projeto.

A rede de segurança protege contra falhas que o projeto não controla — JavaScript desabilitado, bundle bloqueado, erro de hidratação imprevisto. Usá-la para absorver um defeito próprio esconde o defeito e degrada a rede a caminho normal de execução.

Onde código defensivo for mantido por defesa em profundidade depois de a causa conhecida ser eliminada, sua documentação SHALL declarar que a causa foi eliminada, e não descrevê-la como comportamento corrente.

#### Scenario: Sinal de vivacidade não depende de recuperação de raiz

- **WHEN** a home é carregada com `prefers-reduced-motion: reduce` ativo e o React hidrata normalmente
- **THEN** os atributos de `<html>` não são zerados por re-renderização de raiz, e a reaplicação defensiva das classes de estado não é exercida

#### Scenario: Script inline do failsafe permanece executável

- **WHEN** a home é carregada com `prefers-reduced-motion: reduce` ativo
- **THEN** o script inline entregue pelo servidor não é substituído por um nó inerte, e o console não registra aviso sobre elemento `script` renderizado por componente React

#### Scenario: Documentação coerente com o código

- **WHEN** os comentários do sinal de vivacidade e da rede de segurança são lidos
- **THEN** nenhum deles descreve como comportamento corrente uma divergência de hidratação que a mudança eliminou
