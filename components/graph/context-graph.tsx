"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pin } from "lucide-react";
import { scenario } from "@/lib/data";
import { buildGraph, connections, layoutStep, settle, type Graph, type GraphNode, type NodeKind } from "@/lib/graph";
import { Badge, Icon, SourceButton, SourceModal } from "@/components/ui";

const SIZE = { w: 900, h: 560 };
const KINDS: { kind: NodeKind; label: string; hint: string }[] = [
  { kind: "asal", label: "Asal susu", hint: "Farm, RT" },
  { kind: "mutu", label: "Mutu & CIP", hint: "Hasil lab, CIP" },
  { kind: "proses", label: "Aset & proses", hint: "Bay, tangki, lini" },
  { kind: "lot", label: "Lot", hint: "Barang jadi" },
];

/** Bentuk node berbeda per jenis (bukan hanya warna): asal lingkaran, mutu belah ketupat, proses kotak, lot lingkaran kecil. */
function Shape({ node }: { node: GraphNode }) {
  const r = node.r;
  if (node.kind === "mutu") return <rect className="kg-shape" x={-r * 0.8} y={-r * 0.8} width={r * 1.6} height={r * 1.6} rx={2} />;
  if (node.kind === "proses") return <rect className="kg-shape" x={-r} y={-r} width={r * 2} height={r * 2} rx={5} />;
  return <circle className="kg-shape" r={r} />;
}

/** Pemanasan: penataan dihitung sebelum frame pertama sampai `alpha` ini; sisanya jadi animasi singkat. */
const WARM_ALPHA = 0.18;
const px = (v: number) => v.toFixed(2);

/**
 * Kanvas graf: simulasi fisika hidup (node meredam menuju mapan, bisa diseret) + SVG.
 * Tiap frame animasi menggeser elemen SVG langsung lewat atribut (tanpa render ulang React); state React disinkronkan sekali saat gerak selesai.
 * `onPick` dipanggil saat node diklik/Enter (bukan setelah diseret). Reduced-motion: layout statis hasil `settle`.
 */
function GraphCanvas({ graph, hidden, picked, onPick }: { graph: Graph; hidden: Set<NodeKind>; picked: string | null; onPick: (id: string) => void }) {
  const sim = useRef<GraphNode[]>([]);
  const [view, setView] = useState<GraphNode[]>(() => graph.nodes);
  const [hover, setHover] = useState<string | null>(null);
  const drag = useRef<{ id: string; moved: boolean } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const alpha = useRef(1);
  const raf = useRef(0);
  const tick = useRef<() => void>(() => {});
  const nodeEls = useRef(new Map<string, SVGGElement>());
  const edgeEls = useRef(new Map<number, SVGGElement>());

  useLayoutEffect(() => {
    sim.current = graph.nodes.map(n => ({ ...n }));
    const paint = () => {
      const byId = new Map(sim.current.map(n => [n.id, n]));
      for (const n of sim.current) nodeEls.current.get(n.id)?.setAttribute("transform", `translate(${px(n.x)} ${px(n.y)})`);
      graph.edges.forEach((e, i) => {
        const el = edgeEls.current.get(i), a = byId.get(e.source), b = byId.get(e.target);
        if (!el || !a || !b) return;
        const line = el.firstElementChild, text = el.lastElementChild;
        line?.setAttribute("x1", px(a.x)); line?.setAttribute("y1", px(a.y)); line?.setAttribute("x2", px(b.x)); line?.setAttribute("y2", px(b.y));
        text?.setAttribute("x", px((a.x + b.x) / 2)); text?.setAttribute("y", px((a.y + b.y) / 2));
      });
    };
    const finish = () => { raf.current = 0; setView(sim.current.map(n => ({ ...n }))); };
    tick.current = () => {
      alpha.current = Math.max(0.02, alpha.current * 0.985);
      const energy = layoutStep(sim.current, graph.edges, SIZE, alpha.current);
      paint();
      if (energy > 0.05 || drag.current || alpha.current > 0.05) raf.current = requestAnimationFrame(() => tick.current());
      else finish();
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      settle(sim.current, graph.edges, SIZE);
      paint();
      raf.current = requestAnimationFrame(finish);
    } else {
      let a = 1;
      while (a > WARM_ALPHA) { a *= 0.985; layoutStep(sim.current, graph.edges, SIZE, a); }
      alpha.current = a;
      paint();
      raf.current = requestAnimationFrame(() => tick.current());
    }
    return () => cancelAnimationFrame(raf.current);
  }, [graph]);

  const wake = () => {
    alpha.current = Math.max(alpha.current, 0.5);
    if (!raf.current) raf.current = requestAnimationFrame(() => tick.current());
  };
  const point = (e: React.PointerEvent) => {
    const box = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - box.left) / box.width - 0.5) * SIZE.w, y: ((e.clientY - box.top) / box.height - 0.5) * SIZE.h };
  };
  const start = (e: React.PointerEvent, id: string) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { id, moved: false };
    const n = sim.current.find(x => x.id === id);
    if (n) n.pinned = true;
    wake();
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const n = sim.current.find(x => x.id === d.id);
    if (!n) return;
    const p = point(e);
    n.x = Math.max(-SIZE.w / 2 + n.r, Math.min(SIZE.w / 2 - n.r, p.x));
    n.y = Math.max(-SIZE.h / 2 + n.r, Math.min(SIZE.h / 2 - n.r, p.y));
    d.moved = true;
    wake();
  };
  const end = (id: string) => {
    const d = drag.current;
    drag.current = null;
    const n = sim.current.find(x => x.id === id);
    if (n) n.pinned = false;
    if (d && !d.moved) onPick(id);
    wake();
  };

  const focus = hover ?? picked;
  const near = new Set(focus ? [focus, ...connections(graph, focus).map(c => c.node.id)] : []);
  const shown = (n: GraphNode) => !hidden.has(n.kind);
  const live = new Map(view.map(n => [n.id, n]));

  return <div className="kg-scroll"><svg ref={svg} className="kg" viewBox={`${-SIZE.w / 2} ${-SIZE.h / 2} ${SIZE.w} ${SIZE.h}`} role="group" aria-label="Context graph. Daftar hubungan setara tersedia lewat pilihan node." onPointerMove={move}>
    <g>{graph.edges.map((e, i) => {
      const a = live.get(e.source), b = live.get(e.target);
      if (!a || !b || !shown(a) || !shown(b)) return null;
      const on = !!focus && (e.source === focus || e.target === focus);
      return <g key={i} ref={el => { if (el) edgeEls.current.set(i, el); else edgeEls.current.delete(i); }} className={`kg-edge ${e.planned ? "planned" : ""} ${on ? "on" : focus ? "dim" : ""}`}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        <text className="kg-edge-label" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} textAnchor="middle" dy={-4}>{e.label}</text>
      </g>;
    })}</g>
    <g>{view.filter(shown).map(n => {
      const dim = focus && !near.has(n.id);
      const labelled = n.degree >= 3 || (!!focus && near.has(n.id)) || picked === n.id;
      return <g key={n.id} ref={el => { if (el) nodeEls.current.set(n.id, el); else nodeEls.current.delete(n.id); }} className={`kg-node kg-${n.kind} ${dim ? "dim" : ""} ${picked === n.id ? "picked" : ""}`} transform={`translate(${n.x} ${n.y})`}
        tabIndex={0} role="button" aria-pressed={picked === n.id} aria-label={`${n.type} ${n.label}, ${n.degree} hubungan`}
        onPointerDown={e => start(e, n.id)} onPointerUp={() => end(n.id)} onPointerCancel={() => end(n.id)}
        onPointerEnter={() => setHover(n.id)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(n.id)} onBlur={() => setHover(null)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(n.id); } }}>
        <circle className="kg-hit" r={Math.max(n.r + 6, 16)} />
        <Shape node={n} />
        {labelled && <text className="kg-label" y={n.r + 13} textAnchor="middle">{n.label.length > 26 ? `${n.label.slice(0, 25)}…` : n.label}</text>}
      </g>;
    })}</g>
  </svg></div>;
}

/** Context graph gaya graphify: farm, RT, hasil lab, aset proses, dan lot yang saling terhubung. */
export function ContextGraph() {
  const graph = useMemo(() => buildGraph(scenario.graph), []);
  const [hidden, setHidden] = useState<Set<NodeKind>>(new Set());
  const [picked, setPicked] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const sel = picked ? graph.nodes.find(n => n.id === picked) : undefined;
  const list = picked ? connections(graph, picked) : [];

  return <div className="page-enter">
    <div className="page-heading"><div><h1>Context Graph</h1><p>Farm, RT, hasil lab, aset proses, dan lot barang jadi yang saling terhubung. Seret node untuk menggeser, klik untuk melihat hubungannya. Ukuran node mengikuti jumlah hubungan.</p></div></div>
    <section className="card">
      <div className="kg-toolbar">
        <div className="toggle" role="group" aria-label="Tampilkan jenis node">
          {KINDS.map(k => <button key={k.kind} type="button" aria-pressed={!hidden.has(k.kind)} className={hidden.has(k.kind) ? "" : "selected"} onClick={() => setHidden(h => { const next = new Set(h); if (next.has(k.kind)) next.delete(k.kind); else next.add(k.kind); return next; })}>
            <span className={`kg-key kg-${k.kind}`} aria-hidden="true" />{k.label} ({graph.nodes.filter(n => n.kind === k.kind).length})
          </button>)}
        </div>
        <span className="small muted">{graph.nodes.length} node · {graph.edges.length} relasi</span>
      </div>
      <div className="kg-layout">
        <GraphCanvas graph={graph} hidden={hidden} picked={picked} onPick={id => setPicked(p => (p === id ? null : id))} />
        <aside className="kg-detail" aria-live="polite">
          {sel ? <>
            <div className="kg-detail-top"><Badge>{sel.type}</Badge><SourceButton id={sel.source} onSelect={setSource} compact /></div>
            <h2>{sel.label}</h2>
            <p className="small muted">{list.length} relasi</p>
            <ul className="kg-list">{list.map((c, i) => <li key={`${c.node.id}-${i}`}>
              <button type="button" onClick={() => setPicked(c.node.id)}>
                <span className={`kg-key kg-${c.node.kind}`} aria-hidden="true" /><span><strong>{c.node.label}</strong><small className="with-icon"><Icon icon={c.out ? ArrowRight : ArrowLeft} size={11} />{c.label}</small></span>
              </button>
            </li>)}</ul>
          </> : <>
            <p className="small with-icon"><Icon icon={Pin} size={14} />Pilih node untuk melihat hubungannya.</p>
            <ul className="kg-legend">{KINDS.map(k => <li key={k.kind}><span className={`kg-key kg-${k.kind}`} aria-hidden="true" /><span>{k.label} <span className="muted">({k.hint})</span></span></li>)}</ul>
            <p className="small muted">Garis putus-putus = relasi rencana yang belum terjadi. Node besar adalah simpul yang paling banyak dilalui susu, titik yang paling berdampak saat ada gangguan.</p>
          </>}
        </aside>
      </div>
    </section>
    <SourceModal id={source} onClose={() => setSource(null)} />
  </div>;
}
