"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const SAMPLES = ["RAG 技术最新进展", "大模型幻觉如何缓解", "多智能体协作综述"];

type Health = { configured: boolean; model: string };
type RecentSession = { id: string; title: string };

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [query, setQuery] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const [recent, setRecent] = useState<RecentSession[]>([]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      setRecent([]);
      return;
    }
    fetch("/api/sessions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setRecent((data?.sessions ?? []).slice(0, 3)))
      .catch(() => {});
  }, [status]);

  function start(text?: string) {
    const q = (text ?? query).trim();
    if (!q) return;
    localStorage.setItem("researchos:pendingQuery", q);
    router.push("/research");
  }

  return (
    <div className="relative h-full overflow-y-auto">
      {/* 顶部导航 */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 pt-6 lg:px-16">
        <div className="flex items-center gap-2.5">
          <span className="accent-gradient flex h-8 w-8 items-center justify-center rounded-xl text-base glow">
            🧭
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-100">ResearchOS</span>
        </div>
        <div className="flex items-center gap-2.5">
          <ModelPill health={health} />
          {status === "authenticated" ? (
            <>
              <span className="hidden max-w-[160px] truncate text-[13px] text-slate-400 sm:inline">
                {session?.user?.name || session?.user?.email}
              </span>
              <Link
                href="/research"
                className="glass glass-hover rounded-xl px-3.5 py-2 text-[13px] font-medium text-slate-200"
              >
                进入工作台 →
              </Link>
              <button
                onClick={() => signOut({ redirect: false })}
                className="glass glass-hover rounded-xl px-3.5 py-2 text-[13px] font-medium text-slate-400"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="glass glass-hover rounded-xl px-3.5 py-2 text-[13px] font-medium text-slate-200"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="accent-gradient rounded-xl px-3.5 py-2 text-[13px] font-medium text-slate-950 transition active:scale-95"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero + 主卡片 + 功能卡片 */}
      <section className="mx-auto max-w-7xl px-6 pb-12 lg:px-16">
        <h1 className="mt-12 text-[clamp(32px,3vw,44px)] font-semibold leading-tight text-white">
          让 AI 像资深研究员一样工作
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-white/70">
          五个协作的 AI Agent 自主完成「规划 → 检索 → 阅读 → 评审 → 撰写」，
          实时可视化思考过程，生成带权威引用的综述报告。
        </p>

        {/* 主卡片（通栏） */}
        <div className="glass-strong relative mt-12 overflow-hidden rounded-[14px] p-8">
          <div className="accent-gradient pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-15 blur-3xl" />
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-medium text-white">开始新研究</span>
            <span className="h-2 w-2 animate-pulse-glow rounded-full bg-cyan-400" />
          </div>
          <p className="mb-5 mt-2 text-sm text-white/70">
            输入一个研究问题，多智能体流水线即刻启动。
          </p>

          <div className="flex items-center gap-3">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  start();
                }
              }}
              rows={1}
              placeholder="输入研究问题，例如：帮我梳理 RAG 技术的最新进展…"
              className="flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-white/20 focus:border-violet-400/50"
            />
            <button
              onClick={() => start()}
              disabled={!query.trim()}
              className="accent-gradient shrink-0 rounded-xl px-5 py-3 text-sm font-medium text-slate-950 transition active:scale-95 disabled:opacity-40"
            >
              开始研究
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {SAMPLES.map((s) => (
              <button
                key={s}
                onClick={() => start(s)}
                className="glass glass-hover rounded-full px-3.5 py-1.5 text-[13px] text-slate-300"
              >
                {s}
              </button>
            ))}
          </div>

          {/* 最近研究：登录后展示，可一键续聊 */}
          {status === "authenticated" && recent.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/8 pt-4 text-sm text-slate-400">
              <span className="text-slate-500">继续研究：</span>
              {recent.map((s) => (
                <Link
                  key={s.id}
                  href={`/research?session=${encodeURIComponent(s.id)}`}
                  className="glass glass-hover max-w-[220px] truncate rounded-full px-3 py-1 text-[13px] text-slate-300"
                >
                  {s.title}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 4 张等宽功能卡片 */}
        <div className="mt-8 grid grid-cols-12 gap-4 md:gap-6">
          <FeatureCard
            icon="📚"
            title="本地知识库"
            desc="上传 PDF / Markdown / TXT，优先基于你的文献作答。"
            href="/research"
          />
          <FeatureCard
            icon="🔬"
            title="研究空白"
            desc="汇总论文 Limitations，自动推断未来可研究方向。"
            href="/research?tab=stream"
          />
          <FeatureCard
            icon="🕸"
            title="知识图谱"
            desc="自动抽取论文与概念节点，实时可视化关系网络。"
            href="/research?tab=graph"
          />
          <FeatureCard
            icon="📄"
            title="最近报告"
            desc="生成带权威引用的结构化综述，可随时回看。"
            href="/research?tab=report"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  href,
}: {
  icon: string;
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="glass glass-hover col-span-12 flex h-48 flex-col rounded-[14px] p-6 md:col-span-6 lg:col-span-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">{icon}</span>
        <span className="text-base font-medium text-white">{title}</span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-[1.6] text-white/70">{desc}</p>
      <span className="mt-auto self-end text-sm text-white/80">查看 →</span>
    </Link>
  );
}

function ModelPill({ health }: { health: Health | null }) {
  return (
    <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] text-slate-300">
      <StatusDot health={health} />
      {health === null ? "检测中" : health.configured ? "DeepSeek" : "Mock"}
    </span>
  );
}

function StatusDot({ health }: { health: Health | null }) {
  if (health === null) return <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />;
  return (
    <span
      className={`h-1.5 w-1.5 rounded-full ${health.configured ? "bg-emerald-400" : "bg-amber-400"}`}
    />
  );
}
