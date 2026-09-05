// CRAG（Corrective Retrieval Augmented Generation）自我修正检索：
// 检索 -> 相关性评估 -> 不足则重写查询并重试，提升检索质量。
// evaluateRelevance 为确定性启发式（可替换为大模型评审）；rewriteQuery 真实模式调用大模型。

import { chat, delay, isConfigured } from "@/lib/llm";
import type { Paper } from "@/lib/types";

export const MAX_RETRIES = 2;
export const THRESHOLD = 0.5;

export interface RelevanceResult {
  score: number;
  matched: number;
  total: number;
  relevant: boolean;
}

export async function evaluateRelevance(
  query: string,
  papers: Paper[],
): Promise<RelevanceResult> {
  await delay(150);
  return heuristicRelevance(query, papers);
}

export async function rewriteQuery(query: string, attempt: number): Promise<string> {
  if (isConfigured()) {
    try {
      const rewritten = await rewriteWithLLM(query);
      if (rewritten) return rewritten;
    } catch {
      // 回退 Mock
    }
  }
  const expansions = ["检索增强生成 RAG", "大语言模型 LLM", "深度学习"];
  return `${query}（补充检索词：${expansions[attempt % expansions.length]}）`;
}

/** 合并两次检索结果，按 id 去重 */
export function mergePapers(a: Paper[], b: Paper[]): Paper[] {
  const seen = new Set<string>();
  const out: Paper[] = [];
  for (const p of [...a, ...b]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

function heuristicRelevance(query: string, papers: Paper[]): RelevanceResult {
  const terms = extractTerms(query);
  const total = terms.length;
  if (total === 0) return { score: 0, matched: 0, total: 0, relevant: false };

  let matched = 0;
  for (const term of terms) {
    const hit = papers.some((p) =>
      (p.title + " " + p.abstract).toLowerCase().includes(term.toLowerCase()),
    );
    if (hit) matched++;
  }
  const score = matched / total;
  return { score, matched, total, relevant: score >= THRESHOLD };
}

/** 提取查询关键词：英文单词 + 去除停用词后的中文词组 */
function extractTerms(query: string): string[] {
  const en = query.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? [];
  const stop =
    /如何|什么|怎样|哪些|最新|进展|综述|研究|技术|方面|领域|关于|一个|一些|最近|今年|帮我|给我|梳理|介绍|分析|请|的|了|是|在|与|和|及|或|等|对|从|到|中/g;
  const zh = query.replace(stop, " ").match(/[一-龥]{2,}/g) ?? [];
  return [...new Set([...en, ...zh])];
}

async function rewriteWithLLM(query: string): Promise<string> {
  const raw = await chat([
    {
      role: "system",
      content:
        "你是查询重写器。把用户查询改写为更利于学术检索、更具体的查询。只输出重写后的查询，不要解释。",
    },
    { role: "user", content: query },
  ]);
  return raw.trim();
}
