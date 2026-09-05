"use client";

import type { GraphEdge, GraphNode } from "@/lib/types";

export default function KnowledgeGraph({
  graph,
}: {
  graph: { nodes: GraphNode[]; edges: GraphEdge[] } | null;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      {graph && graph.nodes.length > 0 ? (
        <>
          <GraphSvg graph={graph} />
          <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400" /> 论文
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-fuchsia-400" /> 概念
            </span>
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-600">
            概念 ↔ 论文 的引用关系图谱（简化版，可替换为 D3.js 力导向图）
          </p>
        </>
      ) : (
        <Empty text="完成研究后，此处展示论文与概念的知识图谱" />
      )}
    </div>
  );
}

function GraphSvg({ graph }: { graph: { nodes: GraphNode[]; edges: GraphEdge[] } }) {
  const W = 300;
  const H = 300;
  const cx = W / 2;
  const cy = H / 2;

  const papers = graph.nodes.filter((n) => n.group === "paper");
  const concepts = graph.nodes.filter((n) => n.group === "concept");

  const pos: Record<string, { x: number; y: number }> = {};
  papers.forEach((n, i) => {
    const a = (i / Math.max(1, papers.length)) * Math.PI * 2 - Math.PI / 2;
    pos[n.id] = { x: cx + Math.cos(a) * 105, y: cy + Math.sin(a) * 100 };
  });
  concepts.forEach((n, i) => {
    const a = (i / Math.max(1, concepts.length)) * Math.PI * 2 - Math.PI / 2;
    pos[n.id] = { x: cx + Math.cos(a) * 38, y: cy + Math.sin(a) * 38 };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="glass-strong w-full rounded-xl">
      {graph.edges.map((e, i) => {
        const s = pos[e.source];
        const t = pos[e.target];
        if (!s || !t) return null;
        return (
          <line
            key={i}
            x1={s.x}
            y1={s.y}
            x2={t.x}
            y2={t.y}
            stroke="rgba(129,140,248,0.28)"
            strokeWidth={1}
          />
        );
      })}
      {graph.nodes.map((n) => {
        const p = pos[n.id];
        if (!p) return null;
        const isPaper = n.group === "paper";
        return (
          <g key={n.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isPaper ? 8 : 6}
              fill={isPaper ? "rgba(34,211,238,0.18)" : "rgba(192,132,252,0.18)"}
              stroke={isPaper ? "#22d3ee" : "#c084fc"}
              strokeWidth={1.5}
            />
            <text
              x={p.x}
              y={p.y + (isPaper ? 19 : 16)}
              textAnchor="middle"
              fontSize={8}
              fill={isPaper ? "#a5e6f0" : "#e6d5f7"}
            >
              {truncate(n.label, isPaper ? 13 : 9)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-slate-500">
      {text}
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}
