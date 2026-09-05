"use client";

import { Markdown } from "@/components/ui/markdown";

export default function ReportView({ report, running }: { report: string; running: boolean }) {
  return (
    <div className="h-full overflow-y-auto p-4">
      {report ? (
        <div className="glass-strong animate-fade-up rounded-xl p-4">
          <Markdown>{report}</Markdown>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-slate-500">
          {running ? "报告生成中…" : "研究报告将在此展示"}
        </div>
      )}
    </div>
  );
}
