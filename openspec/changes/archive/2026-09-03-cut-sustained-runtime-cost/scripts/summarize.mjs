#!/usr/bin/env node
// Reduz o JSON do measure-runtime a uma tabela comparável.
// Uso: node summarize.mjs <a.json> [b.json]   (dois args = antes/depois)
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
const reports = files.map((f) => JSON.parse(readFileSync(f, "utf8")));

const ROWS = [
  ["rAF/s", (r) => r.rafPerSecond],
  ["CPU% main", (r) => r.metrics.cpuPercentMainThread],
  ["Script s/s", (r) => r.metrics.ScriptDuration.perSecond],
  ["Recalc/s", (r) => r.metrics.RecalcStyleCount.perSecond],
  ["Layout/s", (r) => r.metrics.LayoutCount.perSecond],
  ["Heap MB end", (r) => (r.metrics.JSHeapUsedSize.end / 1048576).toFixed(1)],
  ["Nodes end", (r) => r.metrics.Nodes.end],
  ["Listeners end", (r) => r.metrics.JSEventListeners.end],
];

for (const rep of reports) {
  console.log(`\n### ${rep.label}  (${rep.chromeVersion}, ${rep.viewport}, headless=${rep.headless})`);
  console.log(`env: pointerFine=${rep.environment.pointerFine} hydrated=${rep.environment.hydrated} lenis=${rep.environment.lenisPresent} domEls=${rep.environment.domNodes} scrollH=${rep.environment.scrollHeight}`);
  if (rep.environment.videos?.length) {
    console.log(`video no topo: ${JSON.stringify(rep.environment.videos)}`);
  }
  if (rep.afterScroll) {
    console.log(`apos scroll: y=${rep.afterScroll.scrollY} atBottom=${rep.afterScroll.atBottom} video=${JSON.stringify(rep.afterScroll.videos)}`);
  }
  const names = rep.regimes.map((r) => r.regime);
  const w = 15;
  console.log("");
  console.log(["metrica".padEnd(w), ...names.map((n) => n.padStart(17))].join(" |"));
  console.log("-".repeat(w + names.length * 19));
  for (const [label, fn] of ROWS) {
    const cells = rep.regimes.map((r) => String(fn(r)).padStart(17));
    console.log([label.padEnd(w), ...cells].join(" |"));
  }
  if (rep.heapOverTime) {
    console.log(`\nheap ao longo do tempo (pagina parada):`);
    for (const s of rep.heapOverTime.samples) {
      console.log(`  t=${String(s.minute).padStart(2)}min  ${(s.JSHeapUsedSize / 1048576).toFixed(2)} MB  nodes=${s.Nodes}`);
    }
    console.log(`  apos GC forcado: ${(rep.heapOverTime.afterForcedGC.JSHeapUsedSize / 1048576).toFixed(2)} MB`);
    console.log(`  VEREDITO: ${rep.heapOverTime.verdict}`);
  }
}

if (reports.length === 2) {
  const [a, b] = reports;
  console.log(`\n\n### DELTA  ${a.label} -> ${b.label}\n`);
  const w = 15;
  const names = a.regimes.map((r) => r.regime);
  console.log(["metrica".padEnd(w), ...names.map((n) => n.padStart(22))].join(" |"));
  console.log("-".repeat(w + names.length * 24));
  for (const [label, fn] of ROWS) {
    const cells = names.map((n, i) => {
      const av = Number(fn(a.regimes[i]));
      const bi = b.regimes.find((r) => r.regime === n);
      if (!bi) return "—".padStart(22);
      const bv = Number(fn(bi));
      const pct = av === 0 ? (bv === 0 ? 0 : Infinity) : ((bv - av) / av) * 100;
      const sign = pct > 0 ? "+" : "";
      return `${av} → ${bv} (${sign}${pct.toFixed(0)}%)`.padStart(22);
    });
    console.log([label.padEnd(w), ...cells].join(" |"));
  }
}
