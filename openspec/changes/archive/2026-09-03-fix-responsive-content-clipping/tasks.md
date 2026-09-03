## 1. Fixar a largura útil como contrato (D5)

- [x] 1.1 Em `src/app/(app)/[locale]/page.tsx`, adicionar `w-full` e trocar `lg:mx-auto` por `mx-auto` na `section` que contém os blocos entrelaçados (linha 36)
- [x] 1.2 Aplicar o mesmo `w-full mx-auto` na `section` de FAQs (linha 110), que usa o mesmo par `container lg:mx-auto`
- [ ] 1.3 Medir no DevTools que a área útil da `section` vale exatamente `vw − 32` em 900px, 960px e 1279px, e exatamente 1280px centralizados em 1600px
- [x] 1.4 Adicionar `w-full` ao `div` do `.services_shape` (linha 86), que era um flex item sob `items-center` sem largura declarada — mesma fragilidade de D5, e aqui é carga estrutural para o recorte e para o `right: 0` do overlay

## 2. Converter os seis paths para borda direita infinita (D1, D3)

- [x] 2.1 Em `src/app/(app)/globals.css`, converter `.video_shape` em `md`: substituir `L 720,0 A 16,16 0,0,1 736,16 L 736,454 A 16,16 0,0,1 720,470` por `L 99999,0 L 99999,470`, preservando o entalhe `523/507/473`
- [x] 2.2 Converter `.video_shape` em `lg` da mesma forma, preservando o entalhe `693/677/643`
- [x] 2.3 Converter `.video_shape` em `xl` da mesma forma, preservando o entalhe `202/186/152`
- [x] 2.4 Converter `.services_shape` em `md`: substituir `L 720,80 A 16,16 0,0,1 736,96 L 736,99999` por `L 99999,80 L 99999,99999`, preservando o degrau `473/489/523`
- [x] 2.5 Converter `.services_shape` em `lg` da mesma forma, preservando o degrau `643/659/693`
- [x] 2.6 Converter `.services_shape` em `xl` da mesma forma, preservando o degrau `834/850/884`
- [x] 2.7 Confirmar que o `div` do vídeo mantém `rounded-2xl` e `overflow-hidden`, e que o `div` de serviços mantém `rounded-2xl` — são eles que passam a arredondar as bordas direitas
- [x] 2.8 Reescrever o comentário-âncora acima de `.video_shape` (linhas 286–304): `W` deixa de ser uma das constantes derivadas; documentar que a borda direita é responsabilidade do `border-radius`, no mesmo espírito da nota que já existe sobre o `99999` vertical
- [ ] 2.9 Verificar em 900px, 960px, 1023px, 1150px e 1279px que o fundo escuro e o vídeo alcançam a borda direita da área útil e que nenhum texto ou card fica fora da superfície escura

## 3. Restaurar o canto superior direito do painel de serviços (D2)

- [x] 3.1 Adicionar em `globals.css` um `::after` no wrapper posicionado (o `div` da linha 70 de `page.tsx`), com `content: ''`, `position: absolute`, `right: 0`, `top: calc(408px + 80px)`, `width: 16px`, `height: 16px`
- [x] 3.2 Aplicar `background: radial-gradient(circle 16px at 0 100%, transparent 0 16px, var(--background) 16px)` — o centro do arco em `0 100%` coincide com o centro que o `border-radius` usaria
- [x] 3.3 Escopar o `::after` a `@media (min-width: 768px)`, já que abaixo de `md` não há degrau
- [x] 3.4 Comentar a derivação de `top`: `408` vem do `pt-102` do wrapper e `80` do `y` do degrau nos paths — expressar como soma, não como `488`
- [x] 3.5 Confirmar que o `::after` é irmão e não descendente do `.services_shape` (`clip-path` recorta descendentes)
- [ ] 3.6 Verificar visualmente em 768px, 960px, 1024px, 1279px e 1600px que o canto é indistinguível de um canto produzido por `border-radius`

## 4. Alinhar a visibilidade do vídeo à geometria (D4)

- [x] 4.1 Em `page.tsx` linha 71, trocar `hidden sm:block` por `hidden md:block` e `sm:absolute` por `md:absolute` no bloco de vídeo
- [x] 4.2 Na linha 70, trocar `sm:relative` por `md:relative` e `sm:pt-102` por `md:pt-102` — o `pt-102` reserva os 408px do vídeo e não pode sobreviver sem ele
- [x] 4.3 Na linha 86, trocar `sm:pt-34` por `md:pt-34`
- [x] 4.4 Confirmar que `xl:-mt-102` continua cancelando o `pt-102` corretamente a partir de 1280px
- [ ] 4.5 Verificar em 640px, 700px e 767px que o vídeo está oculto, que o bloco de serviços é um retângulo arredondado sem entalhe, e que não sobrou espaço vertical vazio acima dele
- [ ] 4.6 Verificar que ao cruzar 768px o vídeo aparece já com a faixa de respiro de 18px, sem nenhuma largura intermediária com sobreposição

## 5. Rótulos de serviço sem truncamento (D6)

- [x] 5.1 Em `src/components/ServicesSection/index.tsx` linha 192, remover `text-nowrap` do `h3`
- [x] 5.2 Adicionar `shrink-0` ao ícone (linha 191) para que ele não seja comprimido por um título de duas linhas
- [x] 5.3 Trocar `items-center` por `items-start` no `span` da linha 190, para que o ícone alinhe com a primeira linha do título quando ele quebrar
- [ ] 5.4 Verificar em 768px que "Mobile Development" e "API & Integrations" são lidos por completo nas células de 3 colunas, e que a descrição abaixo continua visível

## 6. Tornar os caps de medida efetivos (D7)

- [x] 6.1 Em `ServicesSection/index.tsx` linha 158, trocar `<span className="max-w-3xl">` por `<div className="max-w-3xl">`, seguindo o padrão já usado em `SectionHeading:39`
- [x] 6.2 Normalizar os `<span>` vizinhos que envolvem `<p>` ou `TextReveal` nesse componente (linhas 151 e 196) para elementos de bloco
- [x] 6.3 Em `src/components/Hero/index.tsx` linha 55, dar display de bloco ao `motion.span` com `max-w-lg` (ou convertê-lo em `motion.div`), preservando a prop `variants={item}`
- [x] 6.4 Confirmar que `Hero:60` (`max-w-106.5 flex`) já é válido e não precisa de mudança
- [x] 6.5 Varrer os componentes por outros `max-w-*`/`min-w-*`/`w-*` aplicados a elementos que permanecem inline e corrigir os que aparecerem
- [ ] 6.6 Verificar em 1024px que a descrição de "Our Services" para em 3xl e que a descrição do Hero para em lg

## 7. Hero legível em telas estreitas (D8)

- [x] 7.1 Em `Hero/index.tsx` linha 30, escalonar `p-20` em variantes responsivas, mantendo `p-20` a partir de `lg`
- [x] 7.2 Na linha 41, escalonar o `p-10` do painel interno da mesma forma
- [x] 7.3 Na linha 43, escalonar `py-20` do bloco de conteúdo
- [x] 7.4 Na linha 50, escalonar `text-6xl` e `leading-20`, mantendo os valores atuais a partir de `lg`
- [x] 7.5 Na linha 60, empilhar os dois CTAs abaixo de `sm` para que os rótulos caibam por completo
- [ ] 7.6 Verificar em 320px, 375px e 414px que o título é exibido por completo, que os rótulos dos CTAs cabem, e que nada estoura horizontalmente
- [ ] 7.7 Verificar em 1280px e 1600px que o Hero está pixel-idêntico ao estado anterior à mudança

## 8. Verificação e fechamento

- [ ] 8.1 Varrer a home em 320, 375, 414, 640, 768, 900, 960, 1023, 1024, 1150, 1279, 1280 e 1600px confirmando ausência de rolagem horizontal e de conteúdo cortado
- [ ] 8.2 Redimensionar continuamente de 768px a 1600px confirmando que a borda direita dos dois blocos acompanha a área útil em todo o percurso, sem saltos
- [ ] 8.3 Confirmar que os 18px de respiro e os arcos concêntricos permanecem corretos nos três trechos do encaixe, em 768, 1024 e 1280px
- [ ] 8.4 Confirmar que o bloco escuro ainda acompanha alturas variáveis de conteúdo do Payload, com os cantos inferiores arredondados
- [ ] 8.5 Validar a interseção `clip-path` × `border-radius` em Chromium, WebKit e Gecko — é a base dos cinco cantos que passaram a depender dela
- [x] 8.6 Rodar `npm run lint` e corrigir o que aparecer
- [ ] 8.7 Revisar as duas questões em aberto do design (quebra de título em duas linhas, largura de empilhamento dos CTAs) com quem responde pelo design antes de fechar
