// 规划 Agent：将用户研究问题拆解为可执行的流水线步骤。
// 真实模式下调用大模型进行意图理解；Mock 模式返回固定研究流水线。

import { chat, isConfigured } from "@/lib/llm";
import type { PlanStep } from "@/lib/types";

export async function plan(query: string): Promise<PlanStep[]> {
  if (isConfigured()) {
    return planWithLLM(query);
  }
  return mockPlan(query);
}

async function planWithLLM(query: string): Promise<PlanStep[]> {
  const prompt = `你是科研规划器。请把下面的研究问题拆解为 4-5 个可执行步骤，每步对应一个角色（检索/阅读/评审/撰写）。
只输出 JSON 数组，字段：{ "title": string }。
研究问题：${query}`;

  const raw = await chat([
    { role: "system", content: "你输出严格的 JSON，不包含任何多余文字。" },
    { role: "user", content: prompt },
  ]);

  try {
    const parsed = JSON.parse(extractJson(raw)) as { title: string }[];
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.slice(0, 5).map((s, i) => stepFromTitle(s.title, i));
    }
  } catch {
    // 解析失败则回退到 Mock
  }
  return mockPlan(query);
}

function stepFromTitle(title: string, i: number): PlanStep {
  const agents: PlanStep["agent"][] = ["searcher", "reader", "critic", "writer", "writer"];
  return { id: `step-${i}`, agent: agents[i] ?? "searcher", title, status: "pending" };
}

function mockPlan(query: string): PlanStep[] {
  return [
    { id: "step-0", agent: "planner", title: `理解问题并提取检索关键词（${keyword(query)}）`, status: "done" },
    { id: "step-1", agent: "searcher", title: "混合检索：向量库 + ArXiv + 联网搜索", status: "pending" },
    { id: "step-2", agent: "reader", title: "深度阅读论文，提取目标/方法/局限", status: "pending" },
    { id: "step-3", agent: "critic", title: "批判性评审：可信度分级 + 争议检测", status: "pending" },
    { id: "step-4", agent: "writer", title: "生成带引用的结构化综述报告", status: "pending" },
  ];
}

function keyword(query: string): string {
  const match = query.match(/[一-龥A-Za-z-]{2,16}/);
  return match ? match[0] : query.slice(0, 12);
}

function extractJson(text: string): string {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  const s2 = text.indexOf("{");
  const e2 = text.lastIndexOf("}");
  if (s2 >= 0 && e2 > s2) return text.slice(s2, e2 + 1);
  return text;
}
