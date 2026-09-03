import { ArrowRightDown } from "@solar-icons/react";
import { notFound } from "next/navigation";
import type React from "react";
import CalendlyCta from "@/components/CalendlyCta";

function Case({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-300 bg-white p-6">
      <span className="font-mono text-xs text-neutral-500">{title}</span>
      <p className="max-w-2xl text-sm text-neutral-700">{note}</p>
      <div className="flex flex-row flex-wrap items-center gap-4 pt-2">
        {children}
      </div>
    </div>
  );
}

export default async function CalendlyFixturePage() {
  // Primeira coisa no corpo, como nas outras fixtures. Fora de desenvolvimento
  // esta rota não existe.
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="flex flex-col gap-6 bg-neutral-100 p-8">
      <header className="text-neutral-900">
        <h1 className="text-2xl font-semibold">CalendlyCta — estados</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-700">
          Fixture só de desenvolvimento. O popup é o real — os pedidos a{" "}
          <code className="font-mono">assets.calendly.com</code> acontecem de
          verdade. A lista do que procurar está no comentário no topo do
          ficheiro.
        </p>
      </header>

      <Case
        title="destino Calendly — o caminho felizes"
        note="Clique simples abre popup. Cmd/Ctrl-clique abre nova aba sem popup. Tab+Enter abre popup. Com o popup aberto, a página por baixo não rola."
      >
        <CalendlyCta
          variant="primary"
          href="https://calendly.com/geral-paradis/30min"
          textSwap
        >
          <span>Schedule a Call</span>
        </CalendlyCta>
        <CalendlyCta
          variant="outline"
          href="https://calendly.com/geral-paradis/30min"
          trailingIcon={ArrowRightDown}
          iconProps={{ size: 20 }}
          circleIcon
          magnetic
          textSwap
        >
          <span>como no Hero (magnetic + circleIcon)</span>
        </CalendlyCta>
      </Case>

      <Case
        title="subdomínio — também é Calendly"
        note="O predicado aceita calendly.com e qualquer subdomínio. Este endereço não existe, portanto o popup abre com erro do lado do Calendly — o que se verifica aqui é que ele ABRE, ou seja que a detecção casou."
      >
        <CalendlyCta variant="outline" href="https://acme.calendly.com/x">
          <span>acme.calendly.com</span>
        </CalendlyCta>
      </Case>

      <Case
        title="hostname que só CONTÉM o texto — não é Calendly"
        note="É o caso que href.includes('calendly.com') deixaria passar. Tem de NAVEGAR (falhando o DNS), nunca abrir popup. Se abrir popup, a detecção voltou a ser por substring."
      >
        <CalendlyCta variant="outline" href="https://calendly.com.exemplo.net/">
          <span>calendly.com.exemplo.net</span>
        </CalendlyCta>
      </Case>

      <Case
        title="destinos que não são Calendly — navegação normal"
        note="Nenhum handler intercepta. O interno leva prefixo de locale porque quem o resolve é o servidor; aqui está escrito à mão, já com o prefixo."
      >
        <CalendlyCta variant="outline" href="/en/get-quote">
          <span>interno (/en/get-quote)</span>
        </CalendlyCta>
        <CalendlyCta variant="outline" href="#href-ancora">
          <span>âncora com nome (#href-ancora)</span>
        </CalendlyCta>
        <CalendlyCta variant="outline" href="mailto:geral@paradis.host">
          <span>mailto:</span>
        </CalendlyCta>
      </Case>

      <Case
        title="sem destino — <button> inerte, não âncora"
        note="Os três valores que contam como ausência de destino. Inspeccionar o DOM: têm de ser <button>, sem atributo href. Um <a href=''> recarregaria a página; um <a href='#'> saltaria para o topo."
      >
        <CalendlyCta variant="outline" href={null}>
          <span>href={"{null}"}</span>
        </CalendlyCta>
        <CalendlyCta variant="outline" href="">
          <span>href=&quot;&quot;</span>
        </CalendlyCta>
        <CalendlyCta variant="outline" href="   ">
          <span>href=&quot; &quot; (só espaços)</span>
        </CalendlyCta>
        <CalendlyCta variant="outline" href="#">
          <span>href=&quot;#&quot; (o defaultValue do CMS)</span>
        </CalendlyCta>
      </Case>

      <Case
        title="nova aba"
        note="Inspeccionar: target='_blank' e rel='noopener noreferrer'. Sem noopener, a página de destino alcançaria o nosso window."
      >
        <CalendlyCta variant="outline" href="https://example.com" openInNewTab>
          <span>openInNewTab</span>
        </CalendlyCta>
      </Case>

      <Case
        title="fallback — o script não carrega"
        note="Este é o único caso que não se prova só clicando. Bloquear assets.calendly.com no DevTools (Network › botão direito num pedido › Block request domain) e clicar no primeiro CTA desta página: em vez de ficar sem resposta, o browser tem de NAVEGAR para o calendly.com. O scroll não pode ficar travado — é o pior modo de falha desta change, e é o que o cenário 'popup fechado sem nunca ter aberto' cobre. Depois de desbloquear, um novo clique tem de voltar a abrir o popup: a promessa falhada é descartada em vez de condenar a sessão."
      >
        <span className="text-sm text-neutral-500">
          Sem botão próprio — usa o primeiro bloco com o domínio bloqueado.
        </span>
      </Case>
    </main>
  );
}
