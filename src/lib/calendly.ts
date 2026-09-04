// Detecção e carregamento do widget do Calendly.
//
// Este módulo é importado só por código de cliente (`CalendlyCta`), e o estado
// que ele guarda é deliberadamente de MÓDULO e não de componente: há dois CTAs
// de Calendly na home — o do `Hero` e o do `Footer` — e são instâncias
// diferentes. Estado por componente faria cada um pedir o script por sua conta.

const WIDGET_CSS = "https://assets.calendly.com/assets/external/widget.css";
const WIDGET_JS = "https://assets.calendly.com/assets/external/widget.js";

// Quanto se espera pelo script antes de desistir e navegar.
//
// **Este número não foi medido.** Está registado como Open Question no
// `design.md` desta change. O compromisso: curto demais rouba o popup a quem
// está numa rede lenta, longo demais deixa o CTA aparentemente morto — e o
// segundo é pior, porque o visitante conclui que o botão está quebrado e vai-se
// embora, em vez de esperar. Daí errar para o lado curto.
const LOAD_TIMEOUT_MS = 6000;

type CalendlyGlobal = {
  initPopupWidget: (options: { url: string }) => void;
};

declare global {
  interface Window {
    Calendly?: CalendlyGlobal;
  }
}

// Um `href` do CMS aponta para o Calendly?
//
// A comparação é sobre o HOSTNAME, e nunca `href.includes("calendly.com")`:
// aquele teste daria verdadeiro para `https://calendly.com.exemplo.net/phish`,
// e o popup passaria a abrir um domínio que não é o Calendly.
//
// O `try/catch` não é defensivo por hábito. Os `href` vêm de um campo de texto
// livre no admin, portanto `"agendar"`, `"mailto:x@y.z"` e `""` são todos
// entradas possíveis, e nenhuma delas pode derrubar o render de um botão.
export function isCalendlyHref(href: string | null | undefined): boolean {
  if (!href) return false;

  try {
    // A base só é usada para `href` relativos, que nunca são Calendly — serve
    // para o construtor não lançar em `/get-quote`.
    const { hostname } = new URL(href, "http://localhost");
    return hostname === "calendly.com" || hostname.endsWith(".calendly.com");
  } catch {
    return false;
  }
}

// A promessa partilhada. `null` até ao primeiro clique — é isto que garante que
// uma página em repouso não faz nenhum pedido a `assets.calendly.com`, que é o
// requisito que mantém esta change fora do regime medido por
// `cut-sustained-runtime-cost`.
let widgetPromise: Promise<CalendlyGlobal> | null = null;

function injectStylesheet() {
  if (document.querySelector(`link[href="${WIDGET_CSS}"]`)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = WIDGET_CSS;
  document.head.appendChild(link);
}

// Carrega o widget, no máximo uma vez por sessão de página.
//
// Não usa `next/script` de propósito: o projecto não o usa em lado nenhum (o
// único script hoje é o failsafe inline em `layout.tsx`), e aquele componente
// modela scripts declarados na árvore — não uma injecção condicional a um
// evento de utilizador, que é o caso aqui.
//
// O `window.onload` do snippet original do Calendly foi descartado: em App
// Router o componente monta depois da hidratação, e nessa altura o evento
// `load` já disparou. O handler nunca correria.
export function loadCalendlyWidget(): Promise<CalendlyGlobal> {
  if (widgetPromise) return widgetPromise;

  widgetPromise = new Promise<CalendlyGlobal>((resolve, reject) => {
    if (window.Calendly) {
      resolve(window.Calendly);
      return;
    }

    injectStylesheet();

    const settle = (outcome: () => void) => {
      window.clearTimeout(timer);
      outcome();
    };

    const timer = window.setTimeout(() => {
      // A promessa falhada é DESCARTADA, para um segundo clique poder tentar de
      // novo. Guardá-la condenaria o CTA ao fallback para o resto da sessão por
      // causa de um único hipo de rede.
      widgetPromise = null;
      reject(new Error("Calendly widget: timeout"));
    }, LOAD_TIMEOUT_MS);

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WIDGET_JS}"]`,
    );
    const script = existing ?? document.createElement("script");

    script.addEventListener("load", () =>
      settle(() => {
        if (window.Calendly) {
          resolve(window.Calendly);
        } else {
          // O script carregou e não definiu o global. Não deveria acontecer,
          // mas rejeitar é o que leva o clique ao fallback de navegação em vez
          // de o deixar sem resposta.
          widgetPromise = null;
          reject(new Error("Calendly widget: global ausente após load"));
        }
      }),
    );

    script.addEventListener("error", () =>
      settle(() => {
        widgetPromise = null;
        reject(new Error("Calendly widget: falha de rede"));
      }),
    );

    if (!existing) {
      script.src = WIDGET_JS;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return widgetPromise;
}
