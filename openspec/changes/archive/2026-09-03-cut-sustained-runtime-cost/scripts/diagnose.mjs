#!/usr/bin/env node
/**
 * Sonda de atribuição: QUEM agenda os rAF, e QUEM escreve estilo por frame.
 *
 * O harness de medição diz "120 rAF/s com a página parada". Esta sonda diz de
 * onde eles vêm, capturando a pilha de chamada no momento do agendamento e
 * agrupando por origem. Cobre a tarefa 1.8 e responde a 1.6 (contagem de
 * cards) de quebra.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 1440, H = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i+1] : d; };
const URL_TARGET = arg("url", "http://localhost:3210/pt");
const SCROLL_TO = Number(arg("scroll-to", "0"));
const WINDOW_S = Number(arg("window", "5"));

class CDP {
  constructor(ws){this.ws=ws;this.id=0;this.p=new Map();this.sessionId=null;
    ws.addEventListener("message",e=>{const m=JSON.parse(e.data);
      if(m.id&&this.p.has(m.id)){const{resolve,reject}=this.p.get(m.id);this.p.delete(m.id);
      m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result);}});}
  send(method,params={}){const id=++this.id;const pl={id,method,params};
    if(this.sessionId)pl.sessionId=this.sessionId;this.ws.send(JSON.stringify(pl));
    return new Promise((res,rej)=>{this.p.set(id,{resolve:res,reject:rej});
      setTimeout(()=>{if(this.p.has(id)){this.p.delete(id);rej(new Error("timeout "+method));}},60000);});}
  async evaluate(e){const r=await this.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
}

// Instalado antes de qualquer script da página.
const PROBE = `
(() => {
  const w = window;
  w.__diag = { raf: {}, styleWrites: {}, rafTotal: 0, recording: false };

  const originOf = (stack) => {
    const lines = (stack || "").split("\\n").slice(1);
    for (const l of lines) {
      // Pular os frames da própria sonda: ela é injetada como <anonymous>.
      if (/<anonymous>/.test(l)) continue;
      if (/__diag|diagProbe/.test(l)) continue;
      // Nome do chunk + função é suficiente para atribuir.
      const m = l.match(/at\\s+([^\\s(]+)\\s*\\(?([^)]*)\\)?/);
      if (!m) continue;
      const fn = m[1];
      const loc = (m[2] || "").split("/").pop() || "";
      if (/^(Object\\.|Module\\.)?requestAnimationFrame$/.test(fn)) continue;
      return fn + " @ " + loc;
    }
    return "unknown";
  };

  const origRaf = w.requestAnimationFrame.bind(w);
  w.requestAnimationFrame = (cb) => {
    if (w.__diag.recording) {
      const key = originOf(new Error().stack);
      w.__diag.raf[key] = (w.__diag.raf[key] || 0) + 1;
      w.__diag.rafTotal++;
    }
    return origRaf(cb);
  };

  // Quem escreve estilo inline por frame? É o que produz os recalcs.
  const sd = CSSStyleDeclaration.prototype;
  for (const method of ["setProperty"]) {
    const orig = sd[method];
    sd[method] = function (...a) {
      if (w.__diag.recording) {
        const key = a[0] + "  <- " + originOf(new Error().stack);
        w.__diag.styleWrites[key] = (w.__diag.styleWrites[key] || 0) + 1;
      }
      return orig.apply(this, a);
    };
  }
  const cssTextDesc = Object.getOwnPropertyDescriptor(sd, "cssText");
  if (cssTextDesc && cssTextDesc.set) {
    Object.defineProperty(sd, "cssText", {
      ...cssTextDesc,
      set(v) {
        if (w.__diag.recording) {
          const key = "cssText  <- " + originOf(new Error().stack);
          w.__diag.styleWrites[key] = (w.__diag.styleWrites[key] || 0) + 1;
        }
        return cssTextDesc.set.call(this, v);
      },
    });
  }
  // transform via .style.transform = ... passa por setProperty? Não: passa pelo
  // setter da propriedade camelCase. Cobrimos as que o Motion usa.
  for (const prop of ["transform", "opacity", "willChange", "width", "height"]) {
    const d = Object.getOwnPropertyDescriptor(sd, prop);
    if (!d || !d.set) continue;
    Object.defineProperty(sd, prop, {
      ...d,
      set(v) {
        if (w.__diag.recording) {
          const key = prop + "  <- " + originOf(new Error().stack);
          w.__diag.styleWrites[key] = (w.__diag.styleWrites[key] || 0) + 1;
        }
        return d.set.call(this, v);
      },
    });
  }
})();
`;

async function main() {
  const profile = mkdtempSync(join(tmpdir(), "lp-diag-"));
  const proc = spawn(CHROME, [
    "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    `--window-size=${W},${H}`, "--headless=new", "--no-first-run",
    "--disable-extensions", "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding", "--autoplay-policy=no-user-gesture-required",
    "--mute-audio",
  ], { stdio: ["ignore","pipe","pipe"] });

  const wsUrl = await new Promise((res, rej) => {
    let b=""; proc.stderr.on("data",d=>{b+=d;const m=b.match(/ws:\/\/[^\s]+/);if(m)res(m[0]);});
    proc.on("exit",c=>rej(new Error("chrome exit "+c+": "+b)));
    setTimeout(()=>rej(new Error("no ws: "+b)),30000);
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((r,j)=>{ws.addEventListener("open",r);ws.addEventListener("error",j);});
  const cdp = new CDP(ws);

  try {
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    cdp.sessionId = sessionId;
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: PROBE });
    await cdp.send("Page.navigate", { url: URL_TARGET });
    await sleep(9000);

    if (SCROLL_TO > 0) {
      await cdp.evaluate(`window.scrollTo(0, ${SCROLL_TO})`);
      await sleep(5000);
    }

    // Inventário estrutural: o que existe e o que está na viewport agora.
    const inventory = await cdp.evaluate(`JSON.stringify((() => {
      const inView = (el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight && r.width > 0 && r.height > 0;
      };
      const testiCards = document.querySelectorAll('[class*="rounded-\\\\[20px\\\\]"]');
      // Contêineres de marquee: overflow-hidden com um filho transformado.
      const marqueeRoots = [...document.querySelectorAll('div.overflow-hidden')].filter(
        d => d.firstElementChild && /will-change/.test(d.firstElementChild.className || '')
      );
      return {
        scrollY: Math.round(scrollY),
        innerHeight,
        totalElements: document.getElementsByTagName('*').length,
        testimonialCards: testiCards.length,
        marqueeRows: marqueeRoots.map(d => ({
          cls: (d.className||'').slice(0, 60),
          inView: inView(d),
          display: getComputedStyle(d).display,
          children: d.firstElementChild ? d.firstElementChild.children.length : 0,
          rectTop: Math.round(d.getBoundingClientRect().top),
          rectH: Math.round(d.getBoundingClientRect().height),
        })),
        videos: [...document.querySelectorAll('video')].map(v => ({
          paused: v.paused, inView: inView(v), readyState: v.readyState,
          currentTime: Number(v.currentTime.toFixed(1)),
        })),
        revealElements: document.querySelectorAll('[data-reveal]').length,
      };
    })())`).then(JSON.parse);

    // Janela de gravação com a página TOTALMENTE parada.
    await cdp.evaluate("window.__diag.recording = true");
    await sleep(WINDOW_S * 1000);
    await cdp.evaluate("window.__diag.recording = false");
    const diag = await cdp.evaluate("JSON.stringify(window.__diag)").then(JSON.parse);

    const top = (obj, n = 12) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

    console.log(`\n=== ALVO: ${URL_TARGET}  scrollY=${inventory.scrollY}  janela=${WINDOW_S}s ===\n`);
    console.log("--- INVENTARIO ---");
    console.log(`elementos no DOM: ${inventory.totalElements}`);
    console.log(`cards de depoimento: ${inventory.testimonialCards}`);
    console.log(`elementos [data-reveal]: ${inventory.revealElements}`);
    console.log(`videos: ${JSON.stringify(inventory.videos)}`);
    console.log(`linhas de marquee (${inventory.marqueeRows.length}):`);
    for (const m of inventory.marqueeRows) {
      console.log(`   inView=${String(m.inView).padEnd(5)} display=${m.display.padEnd(6)} copias=${m.children} top=${String(m.rectTop).padStart(6)} h=${String(m.rectH).padStart(4)}  ${m.cls}`);
    }

    console.log(`\n--- rAF AGENDADOS (${diag.rafTotal} em ${WINDOW_S}s = ${(diag.rafTotal/WINDOW_S).toFixed(1)}/s) ---`);
    for (const [k, v] of top(diag.raf)) {
      console.log(`  ${String(v).padStart(5)}  ${(v/WINDOW_S).toFixed(1)}/s   ${k}`);
    }

    const swTotal = Object.values(diag.styleWrites).reduce((a,b)=>a+b,0);
    console.log(`\n--- ESCRITAS DE ESTILO INLINE (${swTotal} em ${WINDOW_S}s = ${(swTotal/WINDOW_S).toFixed(1)}/s) ---`);
    for (const [k, v] of top(diag.styleWrites)) {
      console.log(`  ${String(v).padStart(5)}  ${(v/WINDOW_S).toFixed(1)}/s   ${k}`);
    }
    console.log("");
  } finally {
    try { ws.close(); } catch {}
    proc.kill("SIGKILL");
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}

main().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
