"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";
import type { KnowledgeDoc } from "@/lib/types";

const PROJECTS = ["RAG 技术综述", "大模型幻觉研究", "多智能体协作", "论文精读笔记"];

export default function Sidebar({
  activeProject,
  running,
  onNewResearch,
  onSelectProject,
}: {
  activeProject: string;
  running: boolean;
  onNewResearch: () => void;
  onSelectProject: (name: string) => void;
}) {
  const [status, setStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      setDocs(data.docs ?? []);
    } catch {
      // 忽略列表加载失败
    }
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
    refreshDocs();
  }, [refreshDocs]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setNotice(null);

    const form = new FormData();
    for (const f of list) form.append("files", f);

    try {
      const res = await fetch("/api/knowledge", { method: "POST", body: form });
      const data = await res.json();
      const results: Array<{ ok: boolean }> = data.results ?? [];
      const okCount = results.filter((r) => r.ok).length;
      const failCount = results.length - okCount;
      setNotice(`入库 ${okCount} 个${failCount ? `，失败 ${failCount} 个` : ""}`);
      await refreshDocs();
    } catch {
      setNotice("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  }

  async function clearAll() {
    await fetch("/api/knowledge", { method: "DELETE" });
    setNotice(null);
    await refreshDocs();
  }

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-white/8 bg-white/[0.02]">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="accent-gradient flex h-9 w-9 items-center justify-center rounded-xl text-lg glow">
            🧪
          </div>
          <div>
            <div className="text-base font-semibold leading-tight">
              <span className="text-gradient">ResearchOS</span>
            </div>
            <div className="text-[11px] text-slate-500">智能科研协作引擎</div>
          </div>
        </div>
      </div>

      {/* 新建研究 */}
      <div className="px-4">
        <button
          onClick={onNewResearch}
          disabled={running}
          className="accent-gradient glow-cyan flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-950 transition active:scale-[0.98] disabled:opacity-50"
        >
          ＋ 新建研究
        </button>
      </div>

      {/* 项目列表 */}
      <div className="mt-5 flex-1 overflow-y-auto px-4">
        <div className="px-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          研究项目
        </div>
        <ul className="mt-2 space-y-1">
          {PROJECTS.map((p) => (
            <li key={p}>
              <button
                onClick={() => onSelectProject(p)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-slate-300 transition",
                  p === activeProject
                    ? "bg-white/8 text-slate-100"
                    : "hover:bg-white/4 hover:text-slate-200",
                )}
              >
                <span className="text-slate-500">📄</span>
                <span className="truncate">{p}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 本地知识库 */}
      <div className="border-t border-white/8 px-4 py-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            本地知识库
          </span>
          {docs.length > 0 && (
            <button
              onClick={clearAll}
              className="text-[10px] text-slate-500 transition hover:text-rose-400"
            >
              清空
            </button>
          )}
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            uploadFiles(e.dataTransfer.files);
          }}
          className="mt-2 cursor-pointer rounded-xl border border-dashed border-white/12 p-3 text-center transition hover:border-violet-400/40"
        >
          <div className="text-[12px] text-slate-400">
            {uploading ? "解析入库中…" : "📎 点击或拖拽上传文档"}
          </div>
          <div className="mt-1 text-[10px] text-slate-600">支持 txt / md / pdf</div>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".txt,.md,.markdown,.pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {notice && <div className="mt-1.5 text-[10px] text-emerald-400">{notice}</div>}

        {docs.length > 0 && (
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-2 rounded-lg bg-white/4 px-2 py-1.5"
                title={d.title}
              >
                <span className="text-slate-500">📄</span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">
                  {d.title}
                </span>
                <span className="shrink-0 text-[9px] text-slate-600">{d.chunks} 块</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 模型状态 */}
      <div className="border-t border-white/8 px-4 py-3">
        {status ? (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">模型状态</span>
            <Badge tone={status.configured ? "green" : "amber"}>
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  status.configured ? "bg-emerald-400" : "bg-amber-400",
                )}
              />
              {status.configured ? "DeepSeek 已连接" : "Mock 模式"}
            </Badge>
          </div>
        ) : (
          <div className="text-[11px] text-slate-600">正在检测模型…</div>
        )}
        {status && (
          <div className="mt-1.5 text-[10px] text-slate-600">模型：{status.model}</div>
        )}
      </div>
    </aside>
  );
}
