"use client";

import type { Evidence, LocalChunk, Paper, PlanStep, ResearchGap } from "@/lib/types";
import { GradeBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function ThinkingStream({
  phase,
  planSteps,
  papers,
  evidence,
  controversy,
  gaps,
  relevance,
  retries,
  localHits,
  toolCalls,
  running,
}: {
  phase: string;
  planSteps: PlanStep[];
  papers: Paper[];
  evidence: Evidence[];
  controversy: string | null;
  gaps: ResearchGap[];
  relevance: { score: number; matched: number; total: number; relevant: boolean } | null;
  retries: { attempt: number; original: string; rewritten: string; reason: string }[];
  localHits: LocalChunk[];
  toolCalls: { name: string; args: Record<string, unknown>; result: string }[];
  running: boolean;
}) {
  const gradeMap = new Map(evidence.map((e) => [e.paperId, e]));

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      {/* 当前阶段 */}
      <div className="glass-strong rounded-xl p-3">
        <div className="text-[11px] uppercase tracking-wider text-slate-500">当前阶段</div>
        <div className="mt-1 text-sm text-slate-200">
          {phase || (running ? "准备中…" : "尚未开始研究")}
        </div>
      </div>

      {/* 研究流水线 */}
      {planSteps.length > 0 && (
        <div className="glass rounded-xl p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">研究流水线</div>
          <ol className="mt-2 space-y-2.5">
            {planSteps.map((s) => (
              <li key={s.id} className="flex items-start gap-2.5">
                <StatusIcon status={s.status} />
                <span
                  className={cn(
                    "text-[13px] leading-snug",
                    s.status === "pending" ? "text-slate-500" : "text-slate-200",
                  )}
                >
                  {s.title}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 工具调用 */}
      {toolCalls.map((t, i) => (
        <div
          key={i}
          className="animate-fade-up rounded-xl border border-cyan-400/20 bg-cyan-400/8 p-3 text-[12px] leading-snug"
        >
          <div className="font-semibold text-cyan-200">🔧 调用工具 {t.name}</div>
          <div className="mt-1 text-slate-400">{t.result}</div>
        </div>
      ))}

      {/* 相关性评估（CRAG） */}
      {relevance && (
        <div className="glass rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500">
              检索相关性评估
            </span>
            <span
              className={cn(
                "text-[12px] font-medium",
                relevance.relevant ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {relevance.relevant ? "✓ 通过" : "⚠ 不足"}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                relevance.relevant ? "bg-emerald-400" : "bg-rose-400",
              )}
              style={{ width: `${Math.round(relevance.score * 100)}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-slate-500">
            {Math.round(relevance.score * 100)}% · 命中 {relevance.matched}/{relevance.total}{" "}
            关键词
          </div>
        </div>
      )}

      {/* 修正记录（CRAG 重试） */}
      {retries.map((r) => (
        <div
          key={r.attempt}
          className="animate-fade-up rounded-xl border border-amber-400/20 bg-amber-400/8 p-3 text-[12px] leading-snug"
        >
          <div className="font-semibold text-amber-200">🔁 第 {r.attempt} 次修正检索</div>
          <div className="mt-1 text-slate-400">{r.reason}</div>
          <div className="mt-1 text-slate-500">
            「{r.original}」→「{r.rewritten}」
          </div>
        </div>
      ))}

      {/* 本地知识库命中 */}
      {localHits.length > 0 && (
        <div className="animate-fade-up rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
            📚 本地知识库命中（{localHits.length}）
          </div>
          <ul className="mt-2 space-y-2">
            {localHits.map((c) => (
              <li key={`${c.docId}-${c.chunkIndex}`} className="text-[12px] leading-snug">
                <div className="font-medium text-emerald-200">
                  《{c.docTitle}》 <span className="text-slate-500">· 相关度 {c.score}</span>
                </div>
                <div className="mt-0.5 text-slate-400">{c.text}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 学术争议点 */}
      {controversy && (
        <div className="animate-fade-up rounded-xl border border-amber-400/20 bg-amber-400/8 p-3 text-[13px] leading-snug text-amber-200">
          <span className="font-semibold">学术争议点 · </span>
          {controversy}
        </div>
      )}

      {/* 研究空白（原创杀手锏） */}
      {gaps.length > 0 && (
        <div className="animate-fade-up rounded-xl border border-violet-400/25 bg-violet-400/8 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
            🔬 研究空白 · 未来方向
          </div>
          <ul className="mt-2 space-y-2.5">
            {gaps.map((g) => (
              <li key={g.id} className="text-[12px] leading-snug">
                <div className="font-medium text-violet-200">{g.title}</div>
                <div className="mt-0.5 text-slate-400">{g.description}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 检索结果与证据分级 */}
      {papers.length > 0 && (
        <div className="glass rounded-xl p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">
            检索结果 · 证据分级（{papers.length}）
          </div>
          <ul className="mt-2 space-y-2.5">
            {papers.map((p) => {
              const ev = gradeMap.get(p.id);
              return (
                <li key={p.id} className="flex items-start gap-2">
                  {ev ? <GradeBadge grade={ev.grade} /> : <span className="w-5" />}
                  <div className="min-w-0 flex-1">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-2 text-[12px] leading-snug text-slate-200 transition hover:text-cyan-300"
                    >
                      {p.title}
                    </a>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {p.authors[0] ?? "佚名"} 等 · {p.year} · {p.venue}
                      {ev ? ` · ${ev.score} 分` : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: PlanStep["status"] }) {
  if (status === "done") return <span className="mt-0.5 text-emerald-400">✓</span>;
  if (status === "running")
    return <span className="mt-1 h-2 w-2 shrink-0 animate-pulse-glow rounded-full bg-cyan-400" />;
  return <span className="mt-1 h-2 w-2 shrink-0 rounded-full border border-slate-600" />;
}
