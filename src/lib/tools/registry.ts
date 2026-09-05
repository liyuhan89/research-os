// 工具注册表：定义智能体可调用的工具（JSON-Schema + 处理器）。
// 这是「智能体自主工具调用」的实现层；通过 MCP 协议暴露时，本表即工具清单。

import { searchArxiv } from "@/lib/tools/arxiv";

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
  };
  run: (args: Record<string, unknown>) => Promise<string>;
}

export const tools: ToolDef[] = [
  {
    name: "calculator",
    description: "计算数学表达式，如 123*456",
    inputSchema: {
      type: "object",
      properties: { expression: { type: "string", description: "数学表达式" } },
    },
    run: async (args) => {
      const expr = String(args.expression ?? "");
      const result = safeEval(expr);
      return result === null ? "无法计算该表达式" : `${expr} = ${result}`;
    },
  },
  {
    name: "get_current_time",
    description: "获取当前日期与时间",
    inputSchema: { type: "object", properties: {} },
    run: async () => new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
  },
  {
    name: "fetch_arxiv",
    description: "检索 ArXiv 论文",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "检索关键词" } },
    },
    run: async (args) => {
      const q = String(args.query ?? "");
      const papers = await searchArxiv(q, 3);
      if (papers.length === 0) return "未找到相关论文";
      return papers.map((p) => `${p.title}（${p.year}）`).join("；");
    },
  },
];

export async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return `未知工具：${name}`;
  try {
    return await tool.run(args);
  } catch (error) {
    return `工具调用失败：${error instanceof Error ? error.message : "未知错误"}`;
  }
}

/** 根据用户问题，决定是否需要调用某个工具（智能体自主决策） */
export function detectToolCall(
  query: string,
): { name: string; args: Record<string, unknown> } | null {
  const math = query.match(/-?\d+(\.\d+)?\s*[+\-*/×÷]\s*-?\d+(\.\d+)?/);
  if (math) {
    return {
      name: "calculator",
      args: { expression: math[0].replace(/×/g, "*").replace(/÷/g, "/") },
    };
  }
  if (/几点|当前时间|现在几点/.test(query)) {
    return { name: "get_current_time", args: {} };
  }
  return null;
}

function safeEval(expr: string): number | null {
  // 仅允许数字与基础运算符，防止任意代码执行
  if (!/^[0-9+\-*/().%\s]+$/.test(expr)) return null;
  try {
    const result = Function(`"use strict"; return (${expr})`)();
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}
