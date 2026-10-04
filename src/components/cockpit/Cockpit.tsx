"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ComparisonRow,
  Evidence,
  GraphEdge,
  GraphNode,
  LocalChunk,
  Paper,
  PlanStep,
  ResearchEvent,
  ResearchGap,
  Session,
  TermEntry,
  UIMessage,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/cockpit/Sidebar";
import ChatPanel from "@/components/cockpit/ChatPanel";
import ThinkingStream from "@/components/cockpit/ThinkingStream";
import KnowledgeGraph from "@/components/cockpit/KnowledgeGraph";
import ReportView from "@/components/cockpit/ReportView";
import ComparisonTable from "@/components/cockpit/ComparisonTable";
import TermsPanel from "@/components/cockpit/TermsPanel";

type Tab = "stream" | "graph" | "report" | "comparison" | "terms";

const TABS: { key: Tab; label: string }[] = [
  { key: "stream", label: "思考流" },
  { key: "graph", label: "知识图谱" },
  { key: "report", label: "报告" },
  { key: "comparison", label: "对比" },
  { key: "terms", label: "术语" },
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

export default function Cockpit({
  initialTab = "stream",
  initialSessionId,
}: {
  initialTab?: Tab;
  initialSessionId?: string;
}) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
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
  const [comparison, setComparison] = useState<ComparisonRow[]>([]);
  const [terms, setTerms] = useState<TermEntry[]>([]);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const suppressAbortRef = useRef(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [steering, setSteering] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const currentSessionIdRef = useRef<string | null>(null);

  // 同步 ref 与 state，让异步回调（如挂载时的 pending 启动）能读到最新会话 id
  function syncCurrentSessionId(id: string | null) {
    currentSessionIdRef.current = id;
    setCurrentSessionId(id);
  }

  // 新建会话（本地生成 id，服务端按 id upsert）
  function createSession(): string {
    const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    syncCurrentSessionId(id);
    setSessions((prev) => [
      { id, title: "新研究", messages: [], updatedAt: Date.now(), createdAt: Date.now() },
      ...prev,
    ]);
    return id;
  }

  // 挂载时：从服务端恢复当前用户的会话；消费首页跳转带入的问题
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let id: string | null = null;
      try {
        const res = await fetch("/api/sessions");
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { sessions: Session[] };
        if (cancelled) return;
        const list = data.sessions ?? [];
        setSessions(list);
        id =
          initialSessionId && list.some((s) => s.id === initialSessionId)
            ? initialSessionId
            : (list[0]?.id ?? null);
        syncCurrentSessionId(id);
        const sess = id ? list.find((s) => s.id === id) : undefined;
        if (sess) setMessages(sess.messages ?? []);
      } catch {
        // 未登录或网络失败：保持空态（proxy 已兜底重定向到登录页）
      }
      if (localStorage.getItem("researchos:sidebarCollapsed") === "1") setSidebarCollapsed(true);
      // 从首页跳转带入的研究问题：消费一次后自动启动（移除即防 StrictMode 重复触发）
      const pending = localStorage.getItem("researchos:pendingQuery");
      if (pending) {
        localStorage.removeItem("researchos:pendingQuery");
        startResearch(pending);
      }
      hydratedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSessionId]);

  // 会话变更时：更新本地列表 + 持久化到服务端（防抖）
  useEffect(() => {
    if (!hydratedRef.current || !currentSessionId) return;
    const firstUser = messages.find((m) => m.role === "user")?.content ?? "";
    const title = firstUser ? firstUser.slice(0, 18) : "新研究";
    const now = Date.now();

    setSessions((prev) => {
      const existing = prev.find((s) => s.id === currentSessionId);
      const entry: Session = {
        id: currentSessionId,
        title,
        messages,
        updatedAt: now,
        createdAt: existing?.createdAt ?? now,
      };
      return prev.some((s) => s.id === currentSessionId)
        ? prev.map((s) => (s.id === currentSessionId ? entry : s))
        : [entry, ...prev];
    });

    const t = setTimeout(() => {
      fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentSessionId, title, messages }),
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [messages, currentSessionId]);

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
    setComparison([]);
    setTerms([]);
  }

  async function startResearch(query: string, steeringInstr?: string) {
    if (!currentSessionIdRef.current) createSession();
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
      case "comparison":
        setComparison(event.rows);
        break;
      case "terms":
        setTerms(event.terms);
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
    createSession();
    setMessages([]);
    setCurrentQuery("");
    setSteering(null);
  }

  function handleSelectSession(id: string) {
    if (id === currentSessionId || running) return;
    const sess = sessions.find((s) => s.id === id);
    if (!sess) return;
    resetResearch();
    syncCurrentSessionId(id);
    setMessages(sess.messages ?? []);
    setCurrentQuery("");
    setSteering(null);
  }

  function handleDeleteSession(id: string) {
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    fetch(`/api/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    if (id === currentSessionId) {
      const fallback = next[0];
      syncCurrentSessionId(fallback?.id ?? null);
      setMessages(fallback?.messages ?? []);
      resetResearch();
      setCurrentQuery("");
      setSteering(null);
    }
  }

  function toggleSidebar() {
    setSidebarCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("researchos:sidebarCollapsed", next ? "1" : "0");
      } catch {
        // 忽略
      }
      return next;
    });
  }

  return (
    <div className="flex h-full w-full">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        running={running}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        onNewResearch={handleNewResearch}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
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
          {tab === "comparison" && <ComparisonTable rows={comparison} running={running} />}
          {tab === "terms" && <TermsPanel terms={terms} running={running} />}
        </div>
      </aside>
    </div>
  );
}
