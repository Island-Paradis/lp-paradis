#!/usr/bin/env node
/**
 * Confere que o caminho degradado de `prefers-reduced-motion` continua
 * exatamente o que era, incluindo a garantia de visibilidade de texto que
 * `prevent-invisible-text` estabelece.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 1440, H = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URL_TARGET = "http://localhost:3210/pt";

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

const results = [];
const check = (n, p, d) => { results.push({n,p,d}); console.log(`${p?"  OK  ":" FALHA"} ${n}${d?`  — ${d}`:""}`); };

const profile = mkdtempSync(join(tmpdir(), "lp-rm-"));
const proc = spawn(CHROME, [
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, `--window-size=${W},${H}`,
  "--headless=new", "--no-first-run", "--disable-extensions",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
  "--autoplay-policy=no-user-gesture-required", "--mute-audio",
], { stdio: ["ignore","pipe","pipe"] });

const wsUrl = await new Promise((res, rej) => {
  let b=""; proc.stderr.on("data",d=>{b+=d;const m=b.match(/ws:\/\/[^\s]+/);if(m)res(m[0]);});
  proc.on("exit",c=>rej(new Error("chrome exit "+c)));
  setTimeout(()=>rej(new Error("no ws")),30000);
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
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => { const w=window; w.__perf={rafFired:0};
      const o=w.requestAnimationFrame.bind(w);
      w.requestAnimationFrame=(cb)=>o((t)=>{w.__perf.rafFired++;return cb(t)});
      w.__perfReset=()=>{w.__perf.rafFired=0}; })();`,
  });
  await cdp.send("Page.navigate", { url: URL_TARGET });
  await sleep(11000);

  const env = await cdp.evaluate(`JSON.stringify({
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    htmlClass: document.documentElement.className,
    hydrated: !!window.__revealReady,
  })`).then(JSON.parse);

  check("emulacao de movimento reduzido ativa", env.reduced === true, `matches=${env.reduced}`);
  check("hidratou", env.hydrated === true, `__revealReady=${env.hydrated}`);
  check("Lenis NAO e montado (scroll nativo)", !/lenis/.test(env.htmlClass), `html.class="${env.htmlClass}"`);

  // A garantia central de `prevent-invisible-text`: nada animado pode ficar
  // invisivel. Sob movimento reduzido isso vale ainda mais.
  // Só conta como falha o que está DENTRO da viewport.
  //
  // Fora dela, `opacity: 0` é o estado correto e esperado: o `whileInView` do
  // `Reveal` ainda não disparou. Uma versão anterior desta checagem não
  // filtrava por viewport e acusava 23 falsos positivos — todos blocos abaixo
  // da dobra, comportando-se exatamente como projetado.
  const invisible = await cdp.evaluate(`JSON.stringify((() => {
    const bad = []; let offscreenHidden = 0; let total = 0;
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      total++;
      const op = parseFloat(getComputedStyle(el).opacity);
      const r = el.getBoundingClientRect();
      const hasText = (el.textContent || '').trim().length > 0;
      const inViewport = r.bottom > 0 && r.top < innerHeight && r.width > 0 && r.height > 0;
      if (!inViewport) { if (op < 0.99) offscreenHidden++; return; }
      if (hasText && op < 0.99) {
        bad.push({ tag: el.tagName, op, top: Math.round(r.top),
                   text: (el.textContent||'').trim().slice(0,40) });
      }
    });
    return { total, offscreenHidden, bad };
  })())`).then(JSON.parse);

  check("nenhum [data-reveal] com texto fica invisivel DENTRO da viewport",
        invisible.bad.length === 0,
        `${invisible.total} elementos, ${invisible.offscreenHidden} ocultos fora da viewport (esperado), ${invisible.bad.length} dentro${invisible.bad.length ? ": " + JSON.stringify(invisible.bad.slice(0,3)) : ""}`);

  const lcp = await cdp.evaluate(`JSON.stringify((() => {
    const p = document.querySelector('p.text-lg.text-primary');
    if (!p) return { missing: true };
    const cs = getComputedStyle(p);
    return { opacity: +cs.opacity, text: (p.textContent||'').trim().slice(0,50),
             visible: p.getBoundingClientRect().height > 0 };
  })())`).then(JSON.parse);
  check("o paragrafo do hero (elemento de LCP) esta visivel",
        !lcp.missing && lcp.opacity >= 0.99 && lcp.visible, JSON.stringify(lcp));

  const parallax = await cdp.evaluate(`JSON.stringify((() => {
    const v = document.querySelector('video');
    if (!v) return { missing: true };
    const inner = v.closest('div.h-full');
    return { hasMotionWrapper: !!inner,
             transform: inner ? getComputedStyle(inner).transform : null,
             willChange: inner ? getComputedStyle(inner).willChange : null };
  })())`).then(JSON.parse);
  check("Parallax renderiza sem wrapper transformado sob movimento reduzido",
        parallax.missing || !parallax.hasMotionWrapper || parallax.transform === "none",
        JSON.stringify(parallax));

  // Folga longa: sem o Lenis, `scrollTo` cai no smooth scroll nativo, e a
  // cauda dessa animação ainda estava rodando com 4 s de espera — apareceu
  // como 6,2 rAF/s que não tinham nada a ver com a aplicação.
  await cdp.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
  await sleep(9000);
  await cdp.evaluate("window.__perfReset()");
  await sleep(6000);
  const raf = await cdp.evaluate("window.__perf.rafFired");
  check("zero rAF parado no rodape sob movimento reduzido", raf === 0, `${(raf/6).toFixed(1)} rAF/s`);

  const vid = await cdp.evaluate(`JSON.stringify((() => { const v=document.querySelector('video');
    return v ? { paused: v.paused } : { missing: true }; })())`).then(JSON.parse);
  check("video pausado no rodape sob movimento reduzido", vid.paused === true, JSON.stringify(vid));

} finally {
  try { ws.close(); } catch {}
  proc.kill("SIGKILL");
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}

const failed = results.filter(r => !r.p);
console.log(`\n=== ${results.length - failed.length}/${results.length} verificacoes passaram ===`);
process.exit(failed.length ? 1 : 0);
