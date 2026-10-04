// 术语 Agent：从研究报告里抽取关键学术术语，并给出「起源 / 发展 / 学者观点」（术语溯源）。
// 真实模式调用 DeepSeek；未配置密钥时回退到固定示例。

import { chat, extractJson, isConfigured } from "@/lib/llm";
import type { TermEntry } from "@/lib/types";

export async function extractTerms(report: string): Promise<TermEntry[]> {
  if (isConfigured()) {
    const terms = await extractWithLLM(report);
    if (terms.length) return terms;
  }
  return mockTerms();
}

async function extractWithLLM(report: string): Promise<TermEntry[]> {
  const prompt = `从下面的研究报告里提取 5-8 个关键学术术语。对每个术语给出：起源（origin）、发展脉络（development）、代表学者观点（scholars）。
只输出 JSON 数组，每个元素形如：{ "term": "...", "origin": "...", "development": "...", "scholars": "..." }。
报告：
${report.slice(0, 4000)}`;

  const raw = await chat([
    { role: "system", content: "你输出严格的 JSON，不包含任何多余文字。" },
    { role: "user", content: prompt },
  ]);

  try {
    const parsed = JSON.parse(extractJson(raw)) as TermEntry[];
    if (Array.isArray(parsed) && parsed.length) {
      return parsed
        .slice(0, 8)
        .filter((t) => t && typeof t.term === "string" && t.term.trim());
    }
  } catch {
    // 解析失败回退 mock
  }
  return [];
}

function mockTerms(): TermEntry[] {
  return [
    {
      term: "检索增强生成（RAG）",
      origin: "2020 年由 Lewis 等人提出，将参数记忆与非参数记忆结合。",
      development: "从朴素 RAG 演进到 Self-RAG、CRAG 等自反思/纠错变体。",
      scholars: "Lewis 主张知识库可更新性；Asai 强调按需检索与自批判。",
    },
    {
      term: "自反思（Self-Reflection）",
      origin: "源自语言模型自我评估与自我修正范式。",
      development: "被引入检索增强，用于决定检索时机与生成质量。",
      scholars: "Asai 等人提出反思 token 机制，实现按需检索。",
    },
    {
      term: "长上下文（Long Context）",
      origin: "随 Transformer 上下文窗口扩展而兴起。",
      development: "发现「Lost in the Middle」现象，影响上下文组织。",
      scholars: "Liu 等人实证模型对中间信息利用最差。",
    },
    {
      term: "知识密集型任务",
      origin: "指需要外部知识支撑才能完成的 NLP 任务。",
      development: "成为检索增强生成的主要应用场景。",
      scholars: "Lewis 等人将其作为 RAG 的核心评测基准。",
    },
  ];
}
