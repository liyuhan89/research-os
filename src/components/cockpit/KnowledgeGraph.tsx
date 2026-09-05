"use client";

import { useEffect, useRef, useState } from "react";
import type { GraphEdge, GraphNode } from "@/lib/types";

interface SimNode {
  id: string;
  label: string;
  group: "paper" | "concept";
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

const W = 300;
const H = 300;

export default function KnowledgeGraph({
  graph,
}: {
  graph: { nodes: GraphNode[]; edges: GraphEdge[] } | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const draggingRef = useRef<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!graph || graph.nodes.length === 0) {
      setReady(false);
      return;
    }

    const nodes: SimNode[] = graph.nodes.map((n, i) => {
      const angle = (i / graph.nodes.length) * Math.PI * 2;
      const r = 60 + (i % 3) * 40;
      return {
        id: n.id,
        label: n.label,
        group: n.group,
        x: W / 2 + Math.cos(angle) * r,
        y: H / 2 + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      };
    });

    nodesRef.current = nodes;
    draggingRef.current = null;
    const edges = graph.edges;
    setPositions(
      nodes.reduce((acc, n) => ({ ...acc, [n.id]: { x: n.x, y: n.y } }), {}),
    );
    setReady(true);

    let raf = 0;
    const tick = () => {
      const ns = nodesRef.current;

      // 斥力（节点两两相斥）
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i];
          const b = ns[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            d2 = 1;
            dx = 1;
            dy = 0;
          }
          const f = 1800 / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          if (a.fx === null) {
            a.vx += fx;
            a.vy += fy;
          }
          if (b.fx === null) {
            b.vx -= fx;
            b.vy -= fy;
          }
        }
      }

      // 弹簧（边连接）
      for (const e of edges) {
        const a = ns.find((n) => n.id === e.source);
        const b = ns.find((n) => n.id === e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 70) * 0.04;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        if (a.fx === null) {
          a.vx += fx;
          a.vy += fy;
        }
        if (b.fx === null) {
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // 向心 + 阻尼 + 位移
      for (const n of ns) {
        if (n.fx !== null && n.fy !== null) {
          n.x = n.fx;
          n.y = n.fy;
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.vx += (W / 2 - n.x) * 0.003;
        n.vy += (H / 2 - n.y) * 0.003;
        n.vx *= 0.86;
        n.vy *= 0.86;
        n.x += n.vx;
        n.y += n.vy;
      }

      setPositions(
        ns.reduce((acc, n) => ({ ...acc, [n.id]: { x: n.x, y: n.y } }), {}),
      );
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [graph]);

  function toSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    return ctm ? pt.matrixTransform(ctm.inverse()) : { x: clientX, y: clientY };
  }

  function onPointerDown(id: string, e: React.PointerEvent) {
    draggingRef.current = id;
    const p = toSvgPoint(e.clientX, e.clientY);
    const n = nodesRef.current.find((n) => n.id === id);
    if (n) {
      n.fx = p.x;
      n.fy = p.y;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const p = toSvgPoint(e.clientX, e.clientY);
    const n = nodesRef.current.find((n) => n.id === draggingRef.current);
    if (n) {
      n.fx = p.x;
      n.fy = p.y;
    }
  }

  function onPointerUp() {
    const n = nodesRef.current.find((n) => n.id === draggingRef.current);
    if (n) {
      n.fx = null;
      n.fy = null;
    }
    draggingRef.current = null;
  }

  if (!ready || !graph) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-4">
        <Empty text="完成研究后，此处展示论文与概念的知识图谱" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="glass-strong w-full cursor-grab rounded-xl touch-none active:cursor-grabbing"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {graph.edges.map((e, i) => {
          const s = positions[e.source];
          const t = positions[e.target];
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
          const p = positions[n.id];
          if (!p) return null;
          const isPaper = n.group === "paper";
          return (
            <g
              key={n.id}
              onPointerDown={(e) => onPointerDown(n.id, e)}
              className="cursor-grab"
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={isPaper ? 9 : 7}
                fill={isPaper ? "rgba(34,211,238,0.18)" : "rgba(192,132,252,0.18)"}
                stroke={isPaper ? "#22d3ee" : "#c084fc"}
                strokeWidth={1.5}
              />
              <text
                x={p.x}
                y={p.y + (isPaper ? 21 : 18)}
                textAnchor="middle"
                fontSize={8}
                fill={isPaper ? "#a5e6f0" : "#e6d5f7"}
                pointerEvents="none"
              >
                {truncate(n.label, isPaper ? 13 : 9)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400" /> 论文
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-fuchsia-400" /> 概念
        </span>
      </div>
      <p className="mt-2 text-center text-[10px] text-slate-600">
        力导向布局 · 节点可拖拽
      </p>
    </div>
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
