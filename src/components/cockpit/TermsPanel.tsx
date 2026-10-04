"use client";

// 术语溯源面板：列出报告关键术语，悬停展开「起源 / 发展 / 学者观点」。

import type { TermEntry } from "@/lib/types";

export default function TermsPanel({ terms, running }: { terms: TermEntry[]; running: boolean }) {
  if (terms.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-slate-500">
        {running ? "术语抽取中…" : "完成研究后，此处展示报告关键术语"}
      </div>
    );
  }

  return (
    <div className="h-full space-y-3 overflow-y-auto p-4">
      <p className="text-[11px] text-slate-500">悬停术语查看「起源 / 发展 / 学者观点」</p>
      {terms.map((t) => (
        <div key={t.term} className="group">
          <div className="glass glass-hover cursor-default rounded-xl px-3.5 py-2.5">
            <span className="text-[13px] font-medium text-violet-200">{t.term}</span>
          </div>
          <div className="glass-strong mt-1 hidden rounded-xl p-3 group-hover:block">
            <Field label="起源" text={t.origin} />
            <Field label="发展" text={t.development} />
            <Field label="学者观点" text={t.scholars} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  return (
    <div className="mb-1.5 text-[12px] leading-relaxed last:mb-0">
      <span className="mr-1.5 font-medium text-slate-400">{label}</span>
      <span className="text-slate-300">{text}</span>
    </div>
  );
}
