// 对比 Agent：对多篇论文按「方法 / 结论 / 局限」维度生成结构化对比。
// 真实模式下调用 DeepSeek 抽取；未配置密钥时复用 reader 的启发式笔记 + critic 分级。

import { chat, extractJson, isConfigured } from "@/lib/llm";
import type { ReadingNote } from "@/agents/reader";
import type { ComparisonRow, Evidence, Paper } from "@/lib/types";

export async function compare(
  papers: Paper[],
  notes: ReadingNote[],
  evidence: Evidence[],
): Promise<ComparisonRow[]> {
  const extra = await extractDimensions(papers, notes);

  const gradeMap = new Map(evidence.map((e) => [e.paperId, e.grade]));
  return extra.map((e) => {
    const p = papers.find((pp) => pp.id === e.paperId);
    return {
      paperId: e.paperId,
      title: p?.title ?? e.paperId,
      year: p?.year ?? 0,
      venue: p?.venue ?? "",
      grade: gradeMap.get(e.paperId) ?? "C",
      method: e.method,
      conclusion: e.conclusion,
      limitation: e.limitation,
    };
  });
}

interface Dimension {
  paperId: string;
  method: string;
  conclusion: string;
  limitation: string;
}

async function extractDimensions(papers: Paper[], notes: ReadingNote[]): Promise<Dimension[]> {
  if (isConfigured()) {
    const rows = await extractWithLLM(papers);
    if (rows.length) return rows;
  }
  // 兜底：复用 reader 的启发式笔记（goal 暂代 conclusion）
  return notes.map((n) => ({
    paperId: n.paperId,
    method: n.method,
    conclusion: n.goal,
    limitation: n.limitation,
  }));
}

async function extractWithLLM(papers: Paper[]): Promise<Dimension[]> {
  const brief = papers
    .map((p, i) => `[${i}] ${p.title}（${p.year}）\n摘要：${p.abstract}`)
    .join("\n\n");

  const prompt = `以下是为研究问题检索到的论文。请对每篇论文提炼三个维度：方法（method）、结论（conclusion）、局限（limitation）。
只输出 JSON 数组，每个元素形如：{ "index": 数字, "method": "...", "conclusion": "...", "limitation": "..." }。
论文：
${brief}`;

  const raw = await chat([
    { role: "system", content: "你输出严格的 JSON，不包含任何多余文字。" },
    { role: "user", content: prompt },
  ]);

  try {
    const parsed = JSON.parse(extractJson(raw)) as {
      index: number;
      method: string;
      conclusion: string;
      limitation: string;
    }[];
    if (Array.isArray(parsed) && parsed.length) {
      return parsed
        .map((r) => {
          const paper = papers[r.index];
          if (!paper) return null;
          return {
            paperId: paper.id,
            method: r.method ?? "",
            conclusion: r.conclusion ?? "",
            limitation: r.limitation ?? "",
          };
        })
        .filter((x): x is Dimension => x !== null);
    }
  } catch {
    // 解析失败回退 mock
  }
  return [];
}
