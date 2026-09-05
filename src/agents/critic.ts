// 评审 Agent（借鉴 JARVIS 的证据分级思想）：对论文进行可信度打分、分级，
// 并检测论文之间的结论冲突（学术争议点）。
// 骨架阶段使用确定性评分引擎；真实模式可替换为大模型评审。

import { delay } from "@/lib/llm";
import type { Evidence, Grade, Paper } from "@/lib/types";

export interface CritiqueResult {
  evidence: Evidence[];
  controversy?: string;
}

const TOP_VENUES = ["NeurIPS", "ICLR", "ACL", "EMNLP", "NAACL", "TACL", "ICML"];

export async function critique(papers: Paper[]): Promise<CritiqueResult> {
  // 逐篇评审的节奏（真实模式下此步骤可调用大模型进行批判性评估）
  await delay(320);

  const evidence: Evidence[] = papers.map((paper) => ({
    paperId: paper.id,
    ...scorePaper(paper),
  }));

  return {
    evidence,
    controversy: detectControversy(papers),
  };
}

function scorePaper(paper: Paper): { grade: Grade; score: number; reason: string } {
  let score = 50;

  if (TOP_VENUES.includes(paper.venue)) score += 25;

  const cites = paper.citations ?? 0;
  if (cites >= 5000) score += 20;
  else if (cites >= 1000) score += 15;
  else if (cites >= 300) score += 8;
  else score += 3;

  if (paper.year >= 2023) score += 5;

  score = Math.min(98, score);
  const grade: Grade = score >= 85 ? "A" : score >= 65 ? "B" : "C";

  const parts = [paper.venue];
  if (paper.citations) parts.push(`引用 ${paper.citations}`);
  if (paper.year >= 2023) parts.push("近两年");
  const reason = parts.join(" · ");

  return { grade, score, reason };
}

/** 轻量「矛盾检测」：当检索结果同时覆盖「检索增益」与「排序代价/微调权衡」两条对立线索时触发 */
function detectControversy(papers: Paper[]): string | undefined {
  const titles = papers.map((p) => p.title.toLowerCase());
  const hasRetrieval = titles.some(
    (t) => t.includes("retrieval") || t.includes("rag") || t.includes("retrieve"),
  );
  const hasTension = titles.some(
    (t) => t.includes("fine-tun") || t.includes("middle") || t.includes("long context"),
  );
  if (hasRetrieval && hasTension) {
    return "检测到「检索带来的知识增益」与「长上下文排序代价 / 微调权衡」之间的学术张力，建议重点考察各方法论的适用边界。";
  }
  return undefined;
}
