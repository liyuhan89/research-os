"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "@/lib/types";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";

const SAMPLES = ["RAG 技术最新进展", "大模型幻觉如何缓解", "多智能体协作综述"];

export default function ChatPanel({
  messages,
  running,
  phase,
  onSend,
  onStop,
  onSteer,
}: {
  messages: UIMessage[];
  running: boolean;
  phase: string;
  onSend: (query: string) => void;
  onStop: () => void;
  onSteer: (instruction: string) => void;
}) {
  const [input, setInput] = useState("");
  const [steerInput, setSteerInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, running, phase]);

  function submit(text?: string) {
    const q = (text ?? input).trim();
    if (!q || running) return;
    onSend(q);
    setInput("");
  }

  function applySteer() {
    const ins = steerInput.trim();
    if (!ins) return;
    onSteer(ins);
    setSteerInput("");
  }

  return (
    <div className="flex h-full flex-col">
      {/* 顶部栏 */}
      <header className="glass flex items-center justify-between border-b border-white/8 px-6 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <span className="accent-gradient h-2 w-2 rounded-full" />
          研究对话
        </div>
        <div className="text-[11px] text-slate-500">多智能体流水线 · SSE 实时流式</div>
      </header>

      {/* 消息区 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
        {messages.length === 0 && !running && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="accent-gradient mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl glow">
              🧭
            </div>
            <h2 className="text-lg font-semibold text-slate-100">
              让 AI 像资深研究员一样工作
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              输入一个研究问题，ResearchOS 会自主规划路径、检索文献、批判性阅读，
              并生成带权威引用的综述报告。研究中途可插入指令实时调整方向。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="glass glass-hover rounded-full px-3 py-1.5 text-[12px] text-slate-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("animate-fade-up flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role === "user" ? (
                <div className="accent-gradient max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-slate-950">
                  {m.content}
                </div>
              ) : (
                <div className="glass-strong max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3">
                  <Markdown>{m.content}</Markdown>
                </div>
              )}
            </div>
          ))}

          {/* 进行中的思考指示器 */}
          {running && (
            <div className="animate-fade-up flex justify-start">
              <div className="glass-strong flex items-center gap-3 rounded-2xl px-4 py-3">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-cyan-300" />
                  <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-violet-300 [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-fuchsia-300 [animation-delay:0.3s]" />
                </span>
                <span className="text-sm text-slate-300">{phase || "正在思考…"}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 输入区 */}
      <div className="border-t border-white/8 px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-2">
          {/* 协同指令：研究中途调整方向 */}
          {running && (
            <div className="flex items-center gap-2">
              <input
                value={steerInput}
                onChange={(e) => setSteerInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applySteer();
                  }
                }}
                placeholder="协同指令，如：缩小范围到 Transformer"
                className="glass flex-1 rounded-xl px-3 py-2 text-[13px] text-slate-100 outline-none placeholder:text-slate-500"
              />
              <button
                onClick={applySteer}
                disabled={!steerInput.trim()}
                className="glass glass-hover rounded-xl px-3 py-2 text-[13px] font-medium text-violet-300 transition active:scale-95 disabled:opacity-40"
              >
                应用指令
              </button>
            </div>
          )}

          <div className="glass-strong flex items-end gap-2 rounded-2xl p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              disabled={running}
              placeholder={running ? "研究中，可输入协同指令调整方向…" : "输入研究问题，例如：帮我梳理 RAG 技术的最新进展…"}
              className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-50"
            />
            <button
              onClick={() => (running ? onStop() : submit())}
              disabled={!running && !input.trim()}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-950 transition active:scale-95 disabled:opacity-40",
                running ? "bg-rose-500 text-white" : "accent-gradient",
              )}
              title={running ? "停止研究" : "发送"}
            >
              {running ? "⏹" : "➤"}
            </button>
          </div>
          <div className="text-center text-[10px] text-slate-600">
            {running
              ? "研究中可随时「应用指令」调整方向，或「⏹」停止"
              : "Enter 发送 · Shift+Enter 换行 · 右侧面板实时展示 AI 思考过程"}
          </div>
        </div>
      </div>
    </div>
  );
}
