"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Evidence,
  GraphEdge,
  GraphNode,
  LocalChunk,
  Paper,
  PlanStep,
  ResearchEvent,
  ResearchGap,
  UIMessage,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/cockpit/Sidebar";
import ChatPanel from "@/components/cockpit/ChatPanel";
import ThinkingStream from "@/components/cockpit/ThinkingStream";
import KnowledgeGraph from "@/components/cockpit/KnowledgeGraph";
import ReportView from "@/components/cockpit/ReportView";

type Tab = "stream" | "graph" | "report";

const TABS: { key: Tab; label: string }[] = [
  { key: "stream", label: "思考流" },
  { key: "graph", label: "知识图谱" },
  { key: "report", label: "报告" },
];

let seq = 0;
function nextId(): string {
  seq += 1;
  return `m-${Date.now()}-${seq}`;
}

/** 解析 SSE 响应流，逐事件回调 */
async function readStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ResearchEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        onEvent(JSON.parse(payload) as ResearchEvent);
      } catch {
        // 忽略无法解析的分块
      }
    }
  }
}

export default function Cockpit() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [controversy, setControversy] = useState<string | null>(null);
  const [gaps, setGaps] = useState<ResearchGap[]>([]);
  const [relevance, setRelevance] = useState<{
    score: number;
    matched: number;
    total: number;
    relevant: boolean;
  } | null>(null);
  const [retries, setRetries] = useState<
    { attempt: number; original: string; rewritten: string; reason: string }[]
  >([]);
  const [localHits, setLocalHits] = useState<LocalChunk[]>([]);
  const [toolCalls, setToolCalls] = useState<
    { name: string; args: Record<string, unknown>; result: string }[]
  >([]);
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [report, setReport] = useState("");
  const [tab, setTab] = useState<Tab>("stream");
  const [activeProject, setActiveProject] = useState("RAG 技术综述");
  const abortRef = useRef<AbortController | null>(null);
  const suppressAbortRef = useRef(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [steering, setSteering] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  // 历史会话持久化：挂载时恢复，变更时保存
  useEffect(() => {
    try {
      const saved = localStorage.getItem("researchos:messages");
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      // 忽略损坏的存储
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem("researchos:messages", JSON.stringify(messages));
    } catch {
      // 存储不可用时忽略
    }
  }, [messages]);

  function resetResearch() {
    setPhase("");
    setPlanSteps([]);
    setPapers([]);
    setEvidence([]);
    setControversy(null);
    setGaps([]);
    setRelevance(null);
    setRetries([]);
    setLocalHits([]);
    setToolCalls([]);
    setGraph(null);
    setReport("");
  }

  async function startResearch(query: string, steeringInstr?: string) {
    setRunning(true);
    resetResearch();
    setTab("stream");
    setCurrentQuery(query);
    setSteering(steeringInstr ?? null);

    setMessages((m) => [...m, { id: nextId(), role: "user", content: query }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, mode: "research", steering: steeringInstr }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`请求失败（${res.status}）`);
      }

      await readStream(res.body, (event) => handleEvent(event));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        if (!suppressAbortRef.current) {
          setMessages((m) => [
            ...m,
            { id: nextId(), role: "assistant", content: "⏹ 研究已中断。" },
          ]);
        }
        return;
      }
      const msg = error instanceof Error ? error.message : "未知错误";
      setMessages((m) => [
        ...m,
        { id: nextId(), role: "assistant", content: `⚠️ 研究出错：${msg}` },
      ]);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function handleSend(query: string) {
    if (running) return;
    startResearch(query);
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  async function handleSteer(instruction: string) {
    if (!currentQuery) return;
    const nextSteering = steering ? `${steering}；${instruction}` : instruction;
    suppressAbortRef.current = true;
    abortRef.current?.abort();
    await new Promise((r) => setTimeout(r, 60));
    suppressAbortRef.current = false;
    setMessages((m) => [
      ...m,
      { id: nextId(), role: "user", content: `（协同指令）${instruction}` },
    ]);
    startResearch(currentQuery, nextSteering);
  }

  function handleEvent(event: ResearchEvent) {
    switch (event.type) {
      case "phase":
        setPhase(event.message);
        break;
      case "plan":
        setPlanSteps(event.steps);
        break;
      case "step":
        setPlanSteps((steps) =>
          steps.map((s) => (s.id === event.stepId ? { ...s, status: event.status } : s)),
        );
        break;
      case "papers":
        setPapers(event.papers);
        break;
      case "scores":
        setEvidence(event.evidence);
        break;
      case "controversy":
        setControversy(event.message);
        break;
      case "gaps":
        setGaps(event.gaps);
        break;
      case "relevance":
        setRelevance({
          score: event.score,
          matched: event.matched,
          total: event.total,
          relevant: event.relevant,
        });
        break;
      case "retry":
        setRetries((r) => [
          ...r,
          {
            attempt: event.attempt,
            original: event.original,
            rewritten: event.rewritten,
            reason: event.reason,
          },
        ]);
        break;
      case "local_hits":
        setLocalHits(event.chunks);
        break;
      case "tool_call":
        setToolCalls((c) => [...c, { name: event.name, args: event.args, result: event.result }]);
        break;
      case "graph":
        setGraph({ nodes: event.nodes, edges: event.edges });
        break;
      case "report_delta":
        setReport((r) => r + event.text);
        break;
      case "done":
        setReport(event.report);
        setMessages((m) => [
          ...m,
          { id: nextId(), role: "assistant", content: event.report },
        ]);
        break;
      case "error":
        setMessages((m) => [
          ...m,
          { id: nextId(), role: "assistant", content: `⚠️ ${event.message}` },
        ]);
        break;
    }
  }

  function handleNewResearch() {
    if (running) return;
    resetResearch();
    setMessages([]);
  }

  return (
    <div className="flex h-full w-full">
      <Sidebar
        activeProject={activeProject}
        running={running}
        onNewResearch={handleNewResearch}
        onSelectProject={setActiveProject}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <ChatPanel
          messages={messages}
          running={running}
          phase={phase}
          onSend={handleSend}
          onStop={handleStop}
          onSteer={handleSteer}
        />
      </main>

      <aside className="flex w-[360px] shrink-0 flex-col border-l border-white/8 bg-white/[0.02]">
        <div className="flex border-b border-white/8 px-3 pt-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative flex-1 pb-2.5 text-[13px] font-medium transition",
                tab === t.key ? "text-slate-100" : "text-slate-500 hover:text-slate-300",
              )}
            >
              {t.label}
              {tab === t.key && (
                <span className="accent-gradient absolute inset-x-2 -bottom-px h-0.5 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1">
          {tab === "stream" && (
            <ThinkingStream
              phase={phase}
              planSteps={planSteps}
              papers={papers}
              evidence={evidence}
              controversy={controversy}
              gaps={gaps}
              relevance={relevance}
              retries={retries}
              localHits={localHits}
              toolCalls={toolCalls}
              running={running}
            />
          )}
          {tab === "graph" && <KnowledgeGraph graph={graph} />}
          {tab === "report" && <ReportView report={report} running={running} />}
        </div>
      </aside>
    </div>
  );
}
