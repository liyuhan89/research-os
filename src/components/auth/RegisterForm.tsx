"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "注册失败，请稍后重试");
      return;
    }

    // 注册成功后自动登录
    const signed = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signed?.error) {
      setError("注册成功，但自动登录失败，请返回登录");
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
        <h1 className="mt-6 text-xl font-semibold text-white">注册</h1>
        <p className="mt-1 text-sm text-white/60">创建账号，开始你的研究</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="昵称（可选）"
            autoComplete="name"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-white/20 focus:border-violet-400/50"
          />
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
            placeholder="密码（至少 6 位）"
            autoComplete="new-password"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-white/20 focus:border-violet-400/50"
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="accent-gradient w-full rounded-xl py-3 text-sm font-medium text-slate-950 transition active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? "注册中…" : "注册并登录"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          已有账号？{" "}
          <Link href="/login" className="text-violet-300 hover:text-violet-200">
            登录
          </Link>
        </p>
      </div>
    </div>
  );
}
