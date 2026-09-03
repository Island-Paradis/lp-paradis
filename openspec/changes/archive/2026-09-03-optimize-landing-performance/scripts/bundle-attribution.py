#!/usr/bin/env python3
"""Atribui os bytes dos chunks de cliente de uma rota aos pacotes de origem.

Uso:
    npx next build --experimental-analyze
    python3 openspec/changes/optimize-landing-performance/scripts/bundle-attribution.py '[locale]'

Lê `.next/diagnostics/analyze/data/<rota>/analyze.data`, que é um JSON precedido
de um prefixo de 4 bytes big-endian com o seu comprimento (o resto do arquivo é
payload binário que não interessa aqui).

O caminho de cada módulo vem quebrado em segmentos encadeados por
`parent_source_index`; `full()` remonta a string original. Os segmentos já
carregam a barra final, então a junção é sem separador.
"""

import collections
import gzip
import json
import os
import re
import struct
import sys

ROUTE = sys.argv[1] if len(sys.argv) > 1 else "[locale]"
DATA = f".next/diagnostics/analyze/data/{ROUTE}/analyze.data"
STATS = ".next/diagnostics/route-bundle-stats.json"


def load(path):
    raw = open(path, "rb").read()
    size = struct.unpack(">I", raw[:4])[0]
    return json.loads(raw[4 : 4 + size].decode("utf-8"))


def package_of(path):
    # pnpm: .pnpm/<pkg>@<ver>_<hash>/node_modules/<nome-real>
    m = re.search(r"\.pnpm/(?:[^/]+/)?node_modules/((?:@[^/]+/)?[^/]+)", path)
    if m:
        return m.group(1)
    m = re.search(r"\.pnpm/([^@/]+|@[^+]+\+[^@/]+)@", path)
    if m:
        return m.group(1).replace("+", "/")
    if "[project]/src" in path:
        return "(código da aplicação)"
    return "(runtime/outros)"


def main():
    j = load(DATA)
    sources, outputs = j["sources"], j["output_files"]

    def full(i):
        parts, depth = [], 0
        while i is not None and depth < 80:
            s = sources[i]
            parts.append(s["path"])
            i = s.get("parent_source_index")
            depth += 1
        return "".join(reversed(parts))

    client = {
        k
        for k, f in enumerate(outputs)
        if f["filename"].startswith("[client-fs]/_next/static/chunks")
    }

    agg = collections.Counter()
    total = 0
    for cp in j["chunk_parts"]:
        if cp["output_file_index"] not in client:
            continue
        agg[package_of(full(cp["source_index"]))] += cp["size"]
        total += cp["size"]

    print(f"Rota {ROUTE} — chunks de cliente: {total:,} B raw\n")
    print(f"{'pacote':34} {'raw':>13} {'%':>7}")
    for name, size in agg.most_common(15):
        print(f"{name:34} {size:>13,} {100 * size / total:6.1f}%")

    if os.path.exists(STATS):
        stats = json.load(open(STATS))
        row = next((r for r in stats if r["route"] == f"/{ROUTE}"), None)
        if row:
            paths = row["firstLoadChunkPaths"]
            gz = sum(len(gzip.compress(open(p, "rb").read(), 6)) for p in paths)
            print(
                f"\nFirst-load: {row['firstLoadUncompressedJsBytes']:,} B raw"
                f" / {gz:,} B gzip-6  ({len(paths)} chunks)"
            )


if __name__ == "__main__":
    main()
