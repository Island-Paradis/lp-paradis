## ADDED Requirements

### Requirement: node_modules SHALL ser materializado uma única vez

A árvore `node_modules` instalada pelo pnpm SHALL ser escrita em exatamente um estágio do build e consumida nesse mesmo estágio. O `Dockerfile` MUST NOT copiar `node_modules` entre estágios.

A árvore tem 1,2 GB e 95.169 arquivos. Cada travessia de fronteira entre estágios força o BuildKit a hashear a árvore inteira, materializar cada hardlink do pnpm como arquivo independente e reescrever todos os inodes em overlayfs — o pior caso de I/O de arquivo pequeno.

#### Scenario: Estágio de build não importa dependências

- **WHEN** o `Dockerfile` é inspecionado
- **THEN** não existe nenhuma diretiva `COPY --from=<stage> …/node_modules …`
- **AND** o `RUN` que executa `pnpm build` está no mesmo estágio que o `RUN` que executa `pnpm install`

#### Scenario: Estágio de runtime recebe apenas a saída standalone

- **WHEN** o estágio final é inspecionado
- **THEN** ele copia somente `public`, `.next/standalone` e `.next/static` do estágio de build
- **AND** não copia `node_modules` diretamente

### Requirement: O store do pnpm SHALL residir no mesmo filesystem que o diretório de trabalho

O diretório de store do pnpm MUST estar no mesmo dispositivo que `/app`, para que a ligação store → `node_modules` use hardlink.

Um cache mount do BuildKit é um dispositivo distinto. Com o store lá, `link(2)` retorna `EXDEV`, o pnpm cai silenciosamente para cópia, e o build paga 1,2 GB de escrita em vez de 95k operações de link.

#### Scenario: Store configurado dentro da árvore de trabalho

- **WHEN** o `Dockerfile` é inspecionado
- **THEN** o store do pnpm está configurado para um caminho sob o mesmo mount que `/app`
- **AND** o cache mount do BuildKit para o store aponta para esse mesmo caminho

#### Scenario: Store não vaza para a imagem final

- **WHEN** o estágio final é inspecionado
- **THEN** o diretório de store não está presente na imagem resultante

### Requirement: O cache do Turbopack SHALL persistir entre builds

O diretório `.next/cache` MUST ser montado como cache do BuildKit durante `pnpm build`.

O build atual descarta 881 MB de cache persistente do Turbopack a cada execução. O motivo documentado no comentário existente do `Dockerfile` — preservar `.next/cache/fetch-cache` para o runtime — não se aplica a este projeto: a rota `/[locale]` não é pré-renderizada, então nenhuma resposta de fetch é capturada em build.

#### Scenario: Build monta o cache do Turbopack

- **WHEN** o `RUN` que executa `pnpm build` é inspecionado
- **THEN** ele declara `--mount=type=cache` com destino `.next/cache`

#### Scenario: Segundo build consecutivo reaproveita o cache

- **WHEN** dois builds são executados em sequência na mesma máquina, sem `--no-cache`, com uma alteração em `src/`
- **THEN** o segundo build completa o step de compilação em menos tempo que o primeiro

### Requirement: pnpm SHALL ser o único gerenciador de pacotes suportado

O `Dockerfile` MUST NOT conter caminhos condicionais para `npm ci` ou `yarn install`. A ausência de `pnpm-lock.yaml` MUST falhar o build com mensagem explícita.

O repositório removeu `package-lock.json` em `788bb58` e nunca teve `yarn.lock`. Ramos que não são exercitados não são testados, e o `Dockerfile` hoje decide o toolchain por presença de arquivo em vez de por declaração.

#### Scenario: Instalação usa pnpm sem ramificação

- **WHEN** o `Dockerfile` é inspecionado
- **THEN** o step de instalação invoca pnpm diretamente, sem `if`/`elif` sobre lockfiles alternativos

#### Scenario: Lockfile ausente falha explicitamente

- **WHEN** um build roda sem `pnpm-lock.yaml` no contexto
- **THEN** o build falha
- **AND** a falha é atribuível ao lockfile ausente, não a um comando não encontrado

### Requirement: A versão do pnpm SHALL ser fixada no manifesto

`package.json` MUST declarar o campo `packageManager` com uma versão exata de pnpm, e o `Dockerfile` MUST derivar o pnpm desse campo.

Sem `packageManager`, `corepack enable pnpm` resolve a versão pela rede a cada build — hoje uma vez por estágio — e duas execuções do mesmo commit podem instalar versões diferentes de pnpm.

#### Scenario: Manifesto declara a versão

- **WHEN** `package.json` é lido
- **THEN** existe um campo `packageManager` no formato `pnpm@<versão exata>`

#### Scenario: Versão do build corresponde à declarada

- **WHEN** o build imprime a versão de pnpm em uso
- **THEN** ela é igual à declarada em `package.json`

### Requirement: O contexto de build SHALL excluir artefatos que não afetam a imagem

`.dockerignore` MUST excluir artefatos de ferramentas locais e caches de build do host que não são entrada da compilação — no mínimo `tsconfig.tsbuildinfo`, `openspec/` e `.claude/`.

O peso é irrelevante; o efeito não é. Qualquer edição desses arquivos hoje altera o contexto, invalida `COPY . .` e força recompilação completa sem que nenhuma entrada real tenha mudado.

#### Scenario: Editar uma spec não invalida a camada de build

- **WHEN** um arquivo sob `openspec/` é alterado e o build é executado novamente sem `--no-cache`
- **THEN** a camada do `COPY` do código-fonte é reaproveitada do cache

#### Scenario: Artefatos de ferramenta local não entram na imagem

- **WHEN** a imagem final é inspecionada
- **THEN** ela não contém `tsconfig.tsbuildinfo`, `openspec/` nem `.claude/`

### Requirement: O contrato de runtime da imagem SHALL permanecer inalterado

A imagem produzida MUST manter o mesmo contrato de execução de antes desta mudança: comando de entrada `node server.js`, usuário não-root `node`, porta `3000`, `NODE_ENV=production`, `HOSTNAME=0.0.0.0`, e `.next` gravável pelo usuário de runtime.

Esta mudança é sobre como a imagem é produzida, não sobre o que ela é. Qualquer divergência de runtime é regressão, não melhoria.

#### Scenario: Container sobe e serve a aplicação

- **WHEN** a imagem construída é executada com as variáveis de ambiente de produção
- **THEN** o servidor atende na porta 3000
- **AND** o processo roda como o usuário `node`

#### Scenario: Rotas de aplicação e admin respondem

- **WHEN** o container em execução recebe requisições para `/en` e para `/admin`
- **THEN** ambas respondem sem erro de servidor
