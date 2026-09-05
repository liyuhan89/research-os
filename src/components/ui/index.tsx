"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GlassButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "glass glass-hover rounded-xl px-4 py-2 text-sm font-medium text-slate-200",
        "transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function GlassCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("glass rounded-2xl", className)}>{children}</div>;
}

type Tone = "default" | "cyan" | "violet" | "green" | "amber" | "rose";

const TONE_CLASS: Record<Tone, string> = {
  default: "bg-white/8 text-slate-300 border-white/10",
  cyan: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20",
  violet: "bg-violet-400/10 text-violet-300 border-violet-400/20",
  green: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  amber: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  rose: "bg-rose-400/10 text-rose-300 border-rose-400/20",
};

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONE_CLASS[tone],
      )}
    >
      {children}
    </span>
  );
}

const GRADE_CLASS: Record<"A" | "B" | "C", string> = {
  A: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  B: "bg-sky-400/15 text-sky-300 border-sky-400/30",
  C: "bg-slate-400/15 text-slate-300 border-slate-400/30",
};

export function GradeBadge({ grade }: { grade: "A" | "B" | "C" }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[11px] font-bold",
        GRADE_CLASS[grade],
      )}
    >
      {grade}
    </span>
  );
}
