// 阅读 Agent：从每篇论文中提取「研究目标 / 方法 / 局限」等结构化信息。
// 骨架阶段以摘要作为阅读输入；后续可接入 PDF 解析（pdf-parse / PyMuPDF）。

import { delay } from "@/lib/llm";
import type { Paper } from "@/lib/types";

export interface ReadingNote {
  paperId: string;
  goal: string;
  method: string;
  limitation: string;
}

export async function read(papers: Paper[]): Promise<ReadingNote[]> {
  const notes: ReadingNote[] = [];
  for (const paper of papers) {
    // 真实 PDF 解析会在此处替换：提取全文 -> 分段 -> 由大模型抽取关键信息
    notes.push(extractFromAbstract(paper));
    await delay(220); // 模拟逐篇阅读的节奏
  }
  return notes;
}

function extractFromAbstract(paper: Paper): ReadingNote {
  const abstract = paper.abstract;
  const goal = firstSentence(abstract);
  return {
    paperId: paper.id,
    goal,
    method: guessMethod(abstract),
    limitation: paper.limitations ?? "（待 PDF 全文解析后由 Critic 进一步评估）",
  };
}

function firstSentence(text: string): string {
  const s = text.split(/[。.!]/)[0]?.trim() ?? "";
  return s.length > 40 ? s.slice(0, 40) + "…" : s;
}

function guessMethod(abstract: string): string {
  const keywords = ["检索", "反思", "纠错", "对比", "实证", "retrieval", "reflection", "corrective"];
  for (const kw of keywords) {
    if (abstract.toLowerCase().includes(kw)) return kw;
  }
  return "（摘要未明确，待全文解析）";
}
