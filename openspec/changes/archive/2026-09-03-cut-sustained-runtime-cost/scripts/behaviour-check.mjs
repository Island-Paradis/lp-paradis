#!/usr/bin/env node
/**
 * Verificações de COMPORTAMENTO que dão para automatizar.
 *
 * O que sobra para conferência humana está listado no fim da execução — esta
 * suíte não substitui olho, ela só tira do olho o que é objetivo.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 1440, H = 900;
const URL_TARGET = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : "http://localhost:3210/pt";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "  OK  " : " FALHA"} ${name}${detail ? `  — ${detail}` : ""}`);
};

const RAF_PROBE = `
(() => {
  const w = window;
  w.__perf = { rafFired: 0 };
  const o = w.requestAnimationFrame.bind(w);
  w.requestAnimationFrame = (cb) => { return o((t) => { w.__perf.rafFired++; return cb(t); }); };
  w.__perfReset = () => { w.__perf.rafFired = 0; };
})();
`;

const profile = mkdtempSync(join(tmpdir(), "lp-behav-"));
const proc = spawn(CHROME, [
  "--remote-debugging-port=0", `--user-data-dir=${profile}`,
  `--window-size=${W},${H}`, "--headless=new", "--no-first-run", "--disable-extensions",
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

const videoState = () => cdp.evaluate(`JSON.stringify((() => {
  const v = document.querySelector("video");
  if (!v) return { missing: true };
  const r = v.getBoundingClientRect();
  return { paused: v.paused, ct: +v.currentTime.toFixed(2), readyState: v.readyState,
           top: Math.round(r.top), visible: r.bottom > 0 && r.top < innerHeight };
})())`).then(JSON.parse);

const rafRate = async (seconds) => {
  await cdp.evaluate("window.__perfReset()");
  await sleep(seconds * 1000);
  const n = await cdp.evaluate("window.__perf.rafFired");
  return +(n / seconds).toFixed(1);
};

// Rolagem por roda, como o usuário — `scrollTo` pularia o easing do Lenis.
const wheelTo = async (targetY) => {
  for (let i = 0; i < 80; i++) {
    const y = await cdp.evaluate("Math.round(scrollY)");
    if (Math.abs(y - targetY) < 60) break;
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseWheel", x: W/2, y: H/2, deltaX: 0,
      deltaY: y < targetY ? 300 : -300, pointerType: "mouse",
    });
    await sleep(60);
  }
  await sleep(2500); // easing do Lenis assentar
  return cdp.evaluate("Math.round(scrollY)");
};

// Posicionar por coordenada calculada uma vez é frágil: o alvo se move com as
// revelações e o easing. Mira no elemento e confere o resultado.
const bringVideoIntoView = async () => {
  for (let attempt = 0; attempt < 6; attempt++) {
    const target = await cdp.evaluate(
      `Math.round(document.querySelector("video").getBoundingClientRect().top + scrollY - innerHeight/2)`
    );
    await wheelTo(Math.max(0, target));
    const s = await videoState();
    if (s.visible) return s;
  }
  return videoState();
};

try {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  cdp.sessionId = sessionId;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: RAF_PROBE });
  await cdp.send("Page.navigate", { url: URL_TARGET });
  await sleep(11000);

  console.log("\n=== VIDEO (item 3) ===");
  let v = await videoState();
  check("pausado com a pagina no topo (fora da viewport)", v.paused === true, `paused=${v.paused} top=${v.top} ct=${v.ct}`);

  v = await bringVideoIntoView();
  check("tocando quando esta na viewport", v.paused === false && v.visible, `paused=${v.paused} visible=${v.visible} ct=${v.ct}`);
  await sleep(1500);
  const vPlaying = await videoState();
  check("currentTime avanca enquanto visivel", vPlaying.ct > v.ct, `${v.ct} -> ${vPlaying.ct}`);

  await wheelTo(await cdp.evaluate("document.documentElement.scrollHeight"));
  const vAway = await videoState();
  check("pausado ao sair da viewport", vAway.paused === true, `paused=${vAway.paused} ct=${vAway.ct}`);
  await sleep(2000);
  const vAway2 = await videoState();
  check("currentTime NAO avanca fora da viewport", Math.abs(vAway2.ct - vAway.ct) < 0.05, `${vAway.ct} -> ${vAway2.ct}`);

  const vBack = await bringVideoIntoView();
  check("retoma de onde parou (nao reinicia)", vBack.ct >= vAway.ct - 0.05 && vBack.ct > 0.5, `parou em ${vAway.ct}, voltou em ${vBack.ct}`);
  check("voltou a tocar", vBack.paused === false && vBack.visible, `paused=${vBack.paused} visible=${vBack.visible}`);

  console.log("\n=== ABA OCULTA (itens 1 e 3) ===");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await cdp.evaluate(`Object.defineProperty(document,'visibilityState',{get:()=>'hidden',configurable:true});
                      document.dispatchEvent(new Event('visibilitychange'))`);
  // Folga maior: o Lenis ainda tem sua carência de sono a cumprir, e o
  // `setState` de promoção do parallax pode agendar um render.
  await sleep(4000);
  const vHidden = await videoState();
  check("video pausa com a aba oculta", vHidden.paused === true, `paused=${vHidden.paused}`);
  const rafHidden = await rafRate(4);
  check("nenhum rAF com a aba oculta e nada rolando", rafHidden === 0, `${rafHidden} rAF/s`);

  await cdp.evaluate(`Object.defineProperty(document,'visibilityState',{get:()=>'visible',configurable:true});
                      document.dispatchEvent(new Event('visibilitychange'))`);
  await sleep(1500);
  const vShown = await videoState();
  check("video retoma ao voltar para a aba", vShown.paused === false, `paused=${vShown.paused}`);

  console.log("\n=== OCIOSIDADE (itens 1 e 2) ===");
  await wheelTo(await cdp.evaluate("document.documentElement.scrollHeight"));
  await sleep(3000);
  const rafIdleBottom = await rafRate(5);
  check("zero rAF parado no rodape (nada animado visivel)", rafIdleBottom === 0, `${rafIdleBottom} rAF/s`);

  await wheelTo(0);
  await sleep(3000);
  const rafIdleTop = await rafRate(5);
  check("rAF no topo cai de 120 para ~60 (so o marquee visivel)",
        rafIdleTop > 30 && rafIdleTop < 75, `${rafIdleTop} rAF/s`);

  console.log("\n=== MARQUEE CONTINUA ANIMANDO (restricao de fechamento) ===");
  const readTransform = () => cdp.evaluate(`(() => {
    const row = [...document.querySelectorAll('div.overflow-hidden')]
      .map(d => d.firstElementChild)
      .filter(c => c && /will-change/.test(c.className || ''))
      .find(c => { const r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
    return row ? getComputedStyle(row).transform : null;
  })()`);
  const t1 = await readTransform();
  await sleep(1200);
  const t2 = await readTransform();
  check("marquee visivel continua se movendo", t1 !== null && t2 !== null && t1 !== t2, `${t1} -> ${t2}`);

  console.log("\n=== SCROLL SUAVE PRESERVADO (item 2) ===");
  await wheelTo(0);
  await sleep(2500);
  // Uma roda só; sob easing a posição deve continuar mudando por vários frames.
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: W/2, y: H/2, deltaX: 0, deltaY: 400, pointerType: "mouse" });
  const ys = [];
  for (let i = 0; i < 12; i++) { ys.push(await cdp.evaluate("Math.round(scrollY)")); await sleep(50); }
  const distinct = new Set(ys).size;
  check("uma roda produz movimento gradual (easing vivo)", distinct >= 4, `posicoes: ${ys.join(",")}`);
  await sleep(2000);
  const settled = await cdp.evaluate("Math.round(scrollY)");
  check("o scroll de fato avancou", settled > 100, `y=${settled}`);

  console.log("\n=== PARALLAX (item 5) ===");
  const parallaxAt = () => cdp.evaluate(`(() => {
    const v = document.querySelector("video");
    if (!v) return null;
    const inner = v.closest('div.h-full');
    if (!inner) return null;
    return { transform: getComputedStyle(inner).transform, willChange: getComputedStyle(inner).willChange };
  })()`);
  await bringVideoIntoView();
  const p1 = await parallaxAt();
  const yNow = await cdp.evaluate("Math.round(scrollY)");
  await wheelTo(yNow + 500);
  const p2 = await parallaxAt();
  check("parallax desloca com o scroll", p1 && p2 && p1.transform !== p2.transform, `${p1?.transform} -> ${p2?.transform}`);
  check("will-change ativo perto da viewport", p2?.willChange === "transform", `willChange=${p2?.willChange}`);

  // No TOPO o vídeo fica a apenas 40 px da dobra, dentro da folga de promoção
  // de 400 px — então lá ele DEVE seguir promovido. A liberação só é
  // observável longe de verdade, no rodapé.
  await wheelTo(await cdp.evaluate("document.documentElement.scrollHeight"));
  await sleep(2500);
  const p3 = await parallaxAt();
  const dist = await cdp.evaluate(`Math.round(Math.abs(document.querySelector("video").getBoundingClientRect().bottom))`);
  check("will-change liberado longe da viewport (rodape)", p3?.willChange !== "transform", `willChange=${p3?.willChange}, video a ${dist}px acima`);

} finally {
  try { ws.close(); } catch {}
  proc.kill("SIGKILL");
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}

const failed = results.filter((r) => !r.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} verificacoes passaram ===`);
if (failed.length) {
  console.log("FALHAS:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
}
console.log(`
FICA PARA CONFERENCIA HUMANA (nao automatizavel aqui):
  - nitidez/pop de camada na borda do parallax (item 5)
  - Memory footprint e GPU memory no Chrome Task Manager (Shift+Esc)
  - sensacao de largada do scroll apos pausa longa
  - inventario visual completo de movimento`);
process.exit(failed.length ? 1 : 0);
