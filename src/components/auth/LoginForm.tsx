"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("邮箱或密码错误");
      return;
    }
    router.push("/research");
    router.refresh();
  }

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="glass-strong w-full max-w-sm rounded-2xl p-8">
        <div className="flex items-center gap-2.5">
          <span className="accent-gradient flex h-8 w-8 items-center justify-center rounded-xl text-base glow">
            🧭
          </span>
          <span className="text-sm font-semibold text-slate-100">ResearchOS</span>
        </div>
        <h1 className="mt-6 text-xl font-semibold text-white">登录</h1>
        <p className="mt-1 text-sm text-white/60">登录后继续你的研究</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            autoComplete="email"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-white/20 focus:border-violet-400/50"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            autoComplete="current-password"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-white/20 focus:border-violet-400/50"
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="accent-gradient w-full rounded-xl py-3 text-sm font-medium text-slate-950 transition active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? "登录中…" : "登录"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          还没有账号？{" "}
          <Link href="/register" className="text-violet-300 hover:text-violet-200">
            注册
          </Link>
        </p>
      </div>
    </div>
  );
}
