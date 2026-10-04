"use client";

// 多文献对比面板：每篇论文一张卡片，按「方法 / 结论 / 局限」三个维度对比。

import { GradeBadge } from "@/components/ui";
import type { ComparisonRow } from "@/lib/types";

export default function ComparisonTable({
  rows,
  running,
}: {
  rows: ComparisonRow[];
  running: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-slate-500">
        {running ? "对比表生成中…" : "完成研究后，此处按「方法 / 结论 / 局限」对比多篇文献"}
      </div>
    );
  }

  return (
    <div className="h-full space-y-3 overflow-y-auto p-4">
      {rows.map((r) => (
        <div key={r.paperId} className="glass-strong rounded-xl p-3.5">
          <div className="mb-2.5 flex items-start justify-between gap-2">
            <span className="text-[13px] font-medium leading-snug text-slate-100">{r.title}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="text-[11px] text-slate-500">{r.year}</span>
              <GradeBadge grade={r.grade} />
            </span>
          </div>
          <dl className="space-y-1.5 text-[12px] leading-relaxed">
            <Row label="方法" text={r.method} />
            <Row label="结论" text={r.conclusion} />
            <Row label="局限" text={r.limitation} />
          </dl>
        </div>
      ))}
    </div>
  );
}

function Row({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-8 shrink-0 text-slate-500">{label}</span>
      <span className="text-slate-300">{text}</span>
    </div>
  );
}
