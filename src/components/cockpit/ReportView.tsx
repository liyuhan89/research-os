"use client";

import { useState } from "react";
import { Markdown } from "@/components/ui/markdown";

export default function ReportView({ report, running }: { report: string; running: boolean }) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // 浏览器原生 TTS：有选区朗读选中文本，否则朗读整篇报告
  function toggleSpeak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const selected = window.getSelection()?.toString()?.trim();
    const text = selected || report;
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utter);
    setSpeaking(true);
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用时忽略
    }
  }

  function downloadMarkdown() {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "research-report.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {report ? (
        <div className="glass-strong animate-fade-up rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              研究报告
            </span>
            <div className="flex gap-2">
              <button
                onClick={toggleSpeak}
                className="glass glass-hover rounded-lg px-2.5 py-1 text-[11px] text-slate-300 transition active:scale-95"
              >
                {speaking ? "⏹ 停止朗读" : "🔊 朗读"}
              </button>
              <button
                onClick={copyMarkdown}
                className="glass glass-hover rounded-lg px-2.5 py-1 text-[11px] text-slate-300 transition active:scale-95"
              >
                {copied ? "✓ 已复制" : "复制 Markdown"}
              </button>
              <button
                onClick={downloadMarkdown}
                className="accent-gradient rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-950 transition active:scale-95"
              >
                下载 .md
              </button>
            </div>
          </div>
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
