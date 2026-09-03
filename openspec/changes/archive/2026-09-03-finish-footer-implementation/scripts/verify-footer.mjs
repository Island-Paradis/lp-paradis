#!/usr/bin/env node
/**
 * Verificação do footer no browser real, via CDP puro.
 *
 * Existe porque build limpo + TypeScript + Biome passaram todos enquanto
 * `GET /en` devolvia HTTP 500 (ver D10 do design: o `asChild` do `Button`
 * entregava dois filhos ao Slot). Verificação estática não alcança o que só
 * aparece renderizando, e as tasks que sobraram abertas depois daquele
 * conserto são exatamente as que pedem um browser.
 *
 * O que ele checa, e qual task cada coisa fecha:
 *
 *   screenshots      1.1 / 5.7 / 8.4 — recorte do footer em desktop e estreito,
 *                    nos dois locales. É a imagem de referência que a linha de
 *                    base não capturou.
 *
 *   nome acessível   6.9 / 7.10 — computado pelo próprio Chrome
 *                    (Accessibility.getPartialAXTree), não inferido do HTML.
 *                    É a diferença entre "tem aria-label" e "o nome que a
 *                    tecnologia assistiva anuncia é este".
 *
 *   ordem de foco    5.6 / 7.9 — Tab de verdade, disparado como input, com
 *                    document.activeElement lido a cada passo.
 *
 *   barra inferior   7.6 — confirma que empilha em ~390px e fica em linha em
 *                    desktop, que foi a decisão tomada na implementação.
 *
 * Só faz GET e lê o DOM. Não escreve no banco e não toca o servidor.
 *
 * Sem dependências: Node 24 tem WebSocket global, então falamos CDP puro —
 * mesma abordagem de `cut-sustained-runtime-cost/scripts/measure-runtime.mjs`,
 * de onde a classe CDP e o launcher vêm.
 *
 * Uso: node verify-footer.mjs [--url http://localhost:3000] [--out DIR]
 */

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const BASE = arg("url", "http://localhost:3000");
const OUT = arg("out", join(process.cwd(), "footer-verify"));
const HEADFUL = process.argv.includes("--headful");

// Desktop é o viewport do mockup. 390 é iPhone 12/13/14, o caso em que o
// copyright e os ícones não cabem na mesma linha.
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "narrow", width: 390, height: 844 },
];
const LOCALES = ["en", "pt"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ CDP -- */

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.sessionId = null;
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error
          ? reject(new Error(JSON.stringify(msg.error)))
          : resolve(msg.result);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (this.sessionId) payload.sessionId = this.sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 120000);
    });
  }

  async evaluate(expression) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) {
      throw new Error(`eval failed: ${JSON.stringify(r.exceptionDetails)}`);
    }
    return r.result.value;
  }

  // Handle vivo (sem returnByValue) — a AX API precisa de um objectId.
  async handle(expression) {
    const r = await this.send("Runtime.evaluate", { expression });
    if (r.exceptionDetails) {
      throw new Error(`eval failed: ${JSON.stringify(r.exceptionDetails)}`);
    }
    return r.result.objectId;
  }
}

async function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), "lp-footer-"));
  const flags = [
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--mute-audio",
    "--force-prefers-reduced-motion",
  ];
  if (!HEADFUL) flags.push("--headless=new");

  const proc = spawn(CHROME, flags, { stdio: ["ignore", "pipe", "pipe"] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    proc.stderr.on("data", (d) => {
      buf += d.toString();
      const m = buf.match(/ws:\/\/[^\s]+/);
      if (m) resolve(m[0]);
    });
    proc.on("exit", (c) => reject(new Error(`chrome exited ${c}: ${buf}`)));
    setTimeout(() => reject(new Error(`chrome no ws url: ${buf}`)), 30000);
  });

  return { proc, wsUrl, profile };
}

/* ------------------------------------------------------------ coletores -- */

// Nome acessível calculado pelo Chrome, por link do footer. Percorre por
// índice porque é o que sobrevive a um DOM que pode remontar entre chamadas.
async function accessibleNames(cdp) {
  const n = await cdp.evaluate(`document.querySelectorAll("footer a").length`);
  const out = [];
  for (let i = 0; i < n; i++) {
    const objectId = await cdp.handle(
      `document.querySelectorAll("footer a")[${i}]`,
    );
    const { nodes } = await cdp.send("Accessibility.getPartialAXTree", {
      objectId,
      fetchRelatives: false,
    });
    const self = nodes?.[0];
    const href = await cdp.evaluate(
      `document.querySelectorAll("footer a")[${i}].getAttribute("href")`,
    );
    out.push({
      href,
      role: self?.role?.value ?? null,
      name: self?.name?.value ?? null,
      ignored: self?.ignored ?? false,
    });
  }
  return out;
}

// Tab de verdade a partir do topo, registrando só o que cai dentro do footer.
async function focusOrder(cdp) {
  await cdp.evaluate(
    `(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); })()`,
  );
  const seen = [];
  const MAX_TABS = 80;
  for (let i = 0; i < MAX_TABS; i++) {
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 9,
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 9,
    });
    const info = await cdp.evaluate(`(() => {
      const el = document.activeElement;
      if (!el || !el.closest("footer")) return null;
      return {
        tag: el.tagName.toLowerCase(),
        href: el.getAttribute("href"),
        label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40),
        focusVisible: (() => { try { return el.matches(":focus-visible"); } catch { return null; } })(),
      };
    })()`);
    if (info) {
      const key = `${info.tag}|${info.href}|${info.label}`;
      if (!seen.some((s) => s.key === key)) seen.push({ key, ...info });
    }
    // Já passou o footer inteiro: para de gastar Tabs.
    if (seen.length > 0 && !info) break;
  }
  return seen.map(({ key, ...rest }) => rest);
}

// A barra inferior tem dois filhos (copyright + ícones). Empilhado significa
// que o segundo começa abaixo do primeiro, não ao lado.
async function bottomBarLayout(cdp) {
  return cdp.evaluate(`(() => {
    const bar = document.querySelector("footer .border-t");
    if (!bar) return { found: false };
    const row = bar.firstElementChild;
    const kids = [...row.children].map((c) => {
      const r = c.getBoundingClientRect();
      return { tag: c.tagName.toLowerCase(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
    });
    let stacked = null;
    if (kids.length >= 2) stacked = kids[1].y >= kids[0].y + 8;
    return { found: true, childCount: kids.length, kids, stacked };
  })()`);
}

// As imagens do footer são `next/image`, logo `loading="lazy"`: abaixo da
// dobra elas nem começam a carregar. Rolar até o footer e fotografar no mesmo
// tick fotografa o logo ausente — foi o que aconteceu na primeira versão deste
// script, e a leitura errada que se seguiu foi concluir que o SVG do logo
// estava quebrado. `currentSrc` vazio é "ainda não buscou", não "falhou".
async function waitFooterImages(cdp, timeoutMs = 15000) {
  const started = Date.now();
  for (;;) {
    const state = await cdp.evaluate(`(() => {
      const imgs = [...document.querySelectorAll("footer img")];
      return {
        total: imgs.length,
        pending: imgs.filter((i) => !i.complete || i.naturalWidth === 0).length,
      };
    })()`);
    if (state.total === 0 || state.pending === 0)
      return { ...state, waitedMs: Date.now() - started };
    if (Date.now() - started > timeoutMs)
      return { ...state, waitedMs: Date.now() - started, timedOut: true };
    await sleep(250);
  }
}

async function footerShot(cdp, file) {
  // Rolar primeiro para acionar o lazy-load, esperar as imagens, e só então
  // medir: o retângulo tem de ser o do estado que será fotografado.
  const exists = await cdp.evaluate(`(() => {
    const f = document.querySelector("footer");
    if (!f) return false;
    f.scrollIntoView({ block: "end" });
    return true;
  })()`);
  if (!exists) return null;
  const images = await waitFooterImages(cdp);
  const rect = await cdp.evaluate(`(() => {
    const f = document.querySelector("footer");
    const r = f.getBoundingClientRect();
    return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height };
  })()`);
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: {
      x: Math.max(0, Math.round(rect.x)),
      y: Math.max(0, Math.round(rect.y)),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      scale: 1,
    },
  });
  writeFileSync(file, Buffer.from(data, "base64"));
  return { file, images, ...rect };
}

/* ----------------------------------------------------------------- main -- */

const { proc, wsUrl, profile } = await launchChrome();
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
const cdp = new CDP(ws);

const report = { base: BASE, at: new Date().toISOString(), runs: [] };
mkdirSync(OUT, { recursive: true });

try {
  const { targetInfos } = await cdp.send("Target.getTargets");
  const page = targetInfos.find((t) => t.type === "page");
  const { sessionId } = await cdp.send("Target.attachToTarget", {
    targetId: page.targetId,
    flatten: true,
  });
  cdp.sessionId = sessionId;

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Accessibility.enable");

  for (const vp of VIEWPORTS) {
    for (const locale of LOCALES) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.name === "narrow",
      });

      const url = `${BASE}/${locale}`;
      const loaded = new Promise((r) => {
        const on = (e) => {
          const m = JSON.parse(e.data);
          if (m.method === "Page.loadEventFired") {
            ws.removeEventListener("message", on);
            r();
          }
        };
        ws.addEventListener("message", on);
      });
      await cdp.send("Page.navigate", { url });
      await loaded;
      // Folga para hidratar: o layout tem uma rede de segurança de
      // visibilidade que só desiste em 10 s, e queremos o estado pós-hidratação.
      await sleep(3500);

      const run = { viewport: vp.name, locale, url };
      run.shot = await footerShot(
        cdp,
        join(OUT, `footer-${locale}-${vp.name}.png`),
      );
      run.bottomBar = await bottomBarLayout(cdp);
      run.links = await accessibleNames(cdp);
      if (vp.name === "desktop") run.focusOrder = await focusOrder(cdp);
      report.runs.push(run);

      const stacked = run.bottomBar?.stacked;
      console.log(
        `${locale}/${vp.name}: ${run.links.length} links, bottom bar ${stacked === null ? "single-child" : stacked ? "STACKED" : "in-row"}, shot ${run.shot ? "ok" : "MISSING"}`,
      );
    }
  }

  writeFileSync(
    join(OUT, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(`\nwrote ${join(OUT, "report.json")}`);
} finally {
  ws.close();
  proc.kill("SIGKILL");
  rmSync(profile, { recursive: true, force: true });
}
