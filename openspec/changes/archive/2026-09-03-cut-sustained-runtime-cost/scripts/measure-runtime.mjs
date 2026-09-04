#!/usr/bin/env node
/**
 * Harness de medição de custo SUSTENTADO para a home.
 *
 * Existe porque o instrumento da change anterior (Lighthouse) é o errado aqui:
 * ele observa os primeiros ~20 s de carregamento e vai embora, e o regime que
 * esta change governa é o que sobra depois. Ver Decisão 8 do design.
 *
 * O que ele mede, e por quê:
 *
 *   rafPerSecond   Contagem direta de callbacks de requestAnimationFrame, via
 *                  monkey-patch instalado ANTES de qualquer script da página
 *                  (Page.addScriptToEvaluateOnNewDocument). É a métrica que
 *                  decide esta change: uma página ociosa deve agendar ZERO.
 *                  Mais decisiva que "CPU %", porque não tem ruído de máquina.
 *
 *   Performance.getMetrics   É literalmente a fonte de dados do Performance
 *                  Monitor do DevTools. TaskDuration/ScriptDuration são
 *                  acumuladores em segundos de CPU; Nodes/JSEventListeners/
 *                  LayoutCount/RecalcStyleCount são contadores. Reportamos
 *                  DELTAS por regime, não valores absolutos.
 *
 * Três regimes, cronometrados, na ordem em que o design os define:
 *   (a) parada  — home no topo, nada acontece
 *   (b) scroll  — roda do mouse, topo ao rodapé
 *   (c) ponteiro— mouse percorrendo o hero, sem rolar
 *
 * Sem dependências: Node 24 tem WebSocket global, então falamos CDP puro.
 *
 * Uso:
 *   node measure-runtime.mjs --url http://localhost:3210/pt --out baseline.json
 *   node measure-runtime.mjs --idle 60 --scroll 30 --pointer 60
 */

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// Viewport fixa do protocolo. Números tirados em viewport diferente não são
// comparáveis: a contagem de nós e o que está na viewport mudam com ela.
const WIDTH = 1440;
const HEIGHT = 900;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const URL_TARGET = arg("url", "http://localhost:3210/pt");
const IDLE_S = Number(arg("idle", "60"));
const SCROLL_S = Number(arg("scroll", "30"));
const POINTER_S = Number(arg("pointer", "60"));
const HEAP_MIN = Number(arg("heap-minutes", "0"));
const OUT = arg("out", null);
const LABEL = arg("label", "unlabeled");
const HEADFUL = process.argv.includes("--headful");

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
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
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
}

async function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), "lp-perf-"));
  const flags = [
    `--remote-debugging-port=0`,
    `--user-data-dir=${profile}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--autoplay-policy=no-user-gesture-required",
    "--mute-audio",
  ];
  if (!HEADFUL) flags.push("--headless=new");

  const proc = spawn(CHROME, flags, { stdio: ["ignore", "pipe", "pipe"] });

  // O Chrome imprime a porta real no stderr quando pedimos porta 0.
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    const onData = (d) => {
      buf += d.toString();
      const m = buf.match(/ws:\/\/[^\s]+/);
      if (m) resolve(m[0]);
    };
    proc.stderr.on("data", onData);
    proc.on("exit", (c) => reject(new Error(`chrome exited ${c}: ${buf}`)));
    setTimeout(() => reject(new Error(`chrome no ws url: ${buf}`)), 30000);
  });

  return { proc, wsUrl, profile };
}

/* -------------------------------------------------------------- métricas -- */

function metricsToObject(list) {
  const o = {};
  for (const m of list) o[m.name] = m.value;
  return o;
}

const TRACKED = [
  "TaskDuration",
  "ScriptDuration",
  "LayoutDuration",
  "RecalcStyleDuration",
  "LayoutCount",
  "RecalcStyleCount",
  "JSHeapUsedSize",
  "JSHeapTotalSize",
  "Nodes",
  "JSEventListeners",
  "Documents",
  "Frames",
];

function diffMetrics(before, after, seconds) {
  const out = {};
  for (const k of TRACKED) {
    const b = before[k] ?? 0;
    const a = after[k] ?? 0;
    // Heap e Nodes são níveis, não acumuladores: reportar o valor final e a
    // variação. Os demais são acumuladores: reportar o delta e a taxa.
    if (k.startsWith("JSHeap") || k === "Nodes" || k === "JSEventListeners" ||
        k === "Documents" || k === "Frames") {
      out[k] = { start: b, end: a, delta: a - b };
    } else {
      const delta = a - b;
      out[k] = {
        delta: Number(delta.toFixed(4)),
        perSecond: Number((delta / seconds).toFixed(4)),
      };
    }
  }
  // CPU efetiva: TaskDuration é tempo de CPU em segundos na thread principal.
  const task = (after.TaskDuration ?? 0) - (before.TaskDuration ?? 0);
  out.cpuPercentMainThread = Number(((task / seconds) * 100).toFixed(2));
  return out;
}

/* -------------------------------------------------------------- regimes -- */

// Instalado antes de QUALQUER script da página, então conta inclusive os rAF
// que a hidratação e as bibliotecas agendam.
const RAF_PROBE = `
(() => {
  const w = window;
  w.__perf = { rafCalls: 0, rafFired: 0, timeouts: 0, intervals: 0 };
  const origRaf = w.requestAnimationFrame.bind(w);
  w.requestAnimationFrame = (cb) => {
    w.__perf.rafCalls++;
    return origRaf((t) => { w.__perf.rafFired++; return cb(t); });
  };
  const origTo = w.setTimeout.bind(w);
  w.setTimeout = (...a) => { w.__perf.timeouts++; return origTo(...a); };
  const origIv = w.setInterval.bind(w);
  w.setInterval = (...a) => { w.__perf.intervals++; return origIv(...a); };
  w.__perfReset = () => {
    w.__perf.rafCalls = 0; w.__perf.rafFired = 0;
    w.__perf.timeouts = 0; w.__perf.intervals = 0;
  };
})();
`;

async function runRegime(cdp, name, seconds, driver) {
  await cdp.evaluate("window.__perfReset && window.__perfReset()");
  const before = metricsToObject((await cdp.send("Performance.getMetrics")).metrics);
  const t0 = Date.now();

  await driver(seconds);

  const elapsed = (Date.now() - t0) / 1000;
  const after = metricsToObject((await cdp.send("Performance.getMetrics")).metrics);
  const probe = await cdp.evaluate("JSON.stringify(window.__perf)");
  const p = JSON.parse(probe || "{}");

  return {
    regime: name,
    seconds: Number(elapsed.toFixed(2)),
    rafFired: p.rafFired ?? null,
    rafPerSecond: p.rafFired != null ? Number((p.rafFired / elapsed).toFixed(1)) : null,
    timeoutsScheduled: p.timeouts ?? null,
    metrics: diffMetrics(before, after, elapsed),
  };
}

const idleDriver = (s) => sleep(s * 1000);

function scrollDriver(cdp) {
  return async (s) => {
    // Roda do mouse de verdade, não scrollTo: o Lenis escuta wheel, e é o
    // caminho que o usuário percorre. scrollTo pularia o easing inteiro.
    const steps = Math.max(1, Math.round(s * 4));
    const perStep = (s * 1000) / steps;
    for (let i = 0; i < steps; i++) {
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x: WIDTH / 2,
        y: HEIGHT / 2,
        deltaX: 0,
        deltaY: 220,
        pointerType: "mouse",
      });
      await sleep(perStep);
    }
  };
}

function pointerDriver(cdp) {
  return async (s) => {
    const steps = Math.max(1, Math.round(s * 30)); // ~30 Hz de movimento
    const perStep = (s * 1000) / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      // Varredura em lissajous pelo hero, para atravessar botões e o h1.
      const x = WIDTH * (0.5 + 0.35 * Math.sin(t * Math.PI * 8));
      const y = HEIGHT * (0.45 + 0.25 * Math.sin(t * Math.PI * 14));
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: Math.round(x),
        y: Math.round(y),
        pointerType: "mouse",
      });
      await sleep(perStep);
    }
  };
}

/* ------------------------------------------------------------------ main -- */

async function main() {
  const { proc, wsUrl, profile } = await launchChrome();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res);
    ws.addEventListener("error", rej);
  });
  const browser = new CDP(ws);

  const report = {
    label: LABEL,
    url: URL_TARGET,
    viewport: `${WIDTH}x${HEIGHT}`,
    headless: !HEADFUL,
    chromeVersion: null,
    startedAt: new Date().toISOString(),
    regimes: [],
    environment: {},
  };

  try {
    const v = await browser.send("Browser.getVersion");
    report.chromeVersion = v.product;

    // Sem width/height: só janelas novas aceitam posição, e a viewport real
    // vem de --window-size mais o setDeviceMetricsOverride abaixo.
    const { targetId } = await browser.send("Target.createTarget", {
      url: "about:blank",
    });
    const { sessionId } = await browser.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    browser.sessionId = sessionId;

    await browser.send("Page.enable");
    await browser.send("Runtime.enable");
    await browser.send("Performance.enable", { timeDomain: "timeTicks" });
    await browser.send("Emulation.setDeviceMetricsOverride", {
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await browser.send("Page.addScriptToEvaluateOnNewDocument", {
      source: RAF_PROBE,
    });

    await browser.send("Page.navigate", { url: URL_TARGET });
    // Espera a rede sossegar e a hidratação acontecer antes de medir.
    await sleep(8000);
    await browser.evaluate(
      "new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r)))"
    );
    await sleep(4000);

    // Contexto que muda a leitura dos números.
    report.environment = await browser.evaluate(`JSON.stringify({
      pointerFine: matchMedia('(pointer: fine)').matches,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      hydrated: !!window.__revealReady,
      lenisPresent: !!document.documentElement.className.match(/lenis/),
      htmlClass: document.documentElement.className,
      videos: [...document.querySelectorAll('video')].map(v => ({
        paused: v.paused, currentSrc: v.currentSrc ? 'set' : 'empty',
        readyState: v.readyState
      })),
      domNodes: document.getElementsByTagName('*').length,
      scrollHeight: document.documentElement.scrollHeight
    })`).then(JSON.parse);

    // (a) parada — a home no topo, nada acontece. É o número que decide a change.
    await browser.evaluate("window.scrollTo(0,0)");
    await sleep(2500);
    report.regimes.push(await runRegime(browser, "a-idle-top", IDLE_S, idleDriver));

    // (b) scroll — topo ao rodapé por roda do mouse.
    await browser.evaluate("window.scrollTo(0,0)");
    await sleep(2500);
    report.regimes.push(
      await runRegime(browser, "b-scroll", SCROLL_S, scrollDriver(browser))
    );

    // Onde o scroll parou, e o que está visível ali (contexto para (a2)).
    report.afterScroll = await browser.evaluate(`JSON.stringify({
      scrollY: Math.round(window.scrollY),
      atBottom: window.scrollY + innerHeight >= document.documentElement.scrollHeight - 50,
      videos: [...document.querySelectorAll('video')].map(v => ({paused: v.paused}))
    })`).then(JSON.parse);

    // Deixar o easing do Lenis terminar. Sem isto, o rabo da animação de
    // scroll vaza para dentro do regime seguinte e o contamina.
    await sleep(4000);

    // (a2) parada longe do vídeo — isola o custo de mídia fora da viewport.
    report.regimes.push(
      await runRegime(browser, "a2-idle-scrolled", IDLE_S, idleDriver)
    );

    // (c) ponteiro — varredura pelo hero, sem rolar.
    await browser.evaluate("window.scrollTo(0,0)");
    await sleep(2500);
    report.regimes.push(
      await runRegime(browser, "c-pointer", POINTER_S, pointerDriver(browser))
    );

    // Eixo "piora com o tempo": heap com a página parada, dois pontos no tempo.
    if (HEAP_MIN > 0) {
      await browser.evaluate("window.scrollTo(0,0)");
      await sleep(2000);
      const gc = async () => {
        await browser.send("HeapProfiler.enable").catch(() => {});
        await browser.send("HeapProfiler.collectGarbage").catch(() => {});
        await sleep(1500);
      };
      await gc();
      const m0 = metricsToObject((await browser.send("Performance.getMetrics")).metrics);
      const samples = [{ minute: 0, JSHeapUsedSize: m0.JSHeapUsedSize, Nodes: m0.Nodes }];
      for (let i = 1; i <= HEAP_MIN; i++) {
        await sleep(60000);
        const mi = metricsToObject((await browser.send("Performance.getMetrics")).metrics);
        samples.push({ minute: i, JSHeapUsedSize: mi.JSHeapUsedSize, Nodes: mi.Nodes });
      }
      await gc();
      const mf = metricsToObject((await browser.send("Performance.getMetrics")).metrics);
      report.heapOverTime = {
        samples,
        afterForcedGC: { JSHeapUsedSize: mf.JSHeapUsedSize, Nodes: mf.Nodes },
        // Retenção real sobrevive a um GC forçado; serrilhado, não.
        verdict:
          mf.JSHeapUsedSize > samples[0].JSHeapUsedSize * 1.15
            ? "CRESCIMENTO MONOTONICO (retencao) — sobrevive a GC forcado"
            : "SEM RETENCAO — variacao e serrilhado de GC",
      };
    }
  } finally {
    try { ws.close(); } catch {}
    proc.kill("SIGKILL");
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }

  const json = JSON.stringify(report, null, 2);
  if (OUT) {
    writeFileSync(OUT, json);
    console.error(`escrito: ${OUT}`);
  }
  console.log(json);
}

main().catch((e) => {
  console.error("FALHOU:", e.message);
  process.exit(1);
});
