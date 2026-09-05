// ArXiv 检索工具（免密钥的真实 API 调用）
// 返回结构化 Paper 列表，供 searcher Agent 使用。

import type { Paper } from "@/lib/types";

const ARXIV_API = "https://export.arxiv.org/api/query";

function stripTags(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** 检索 ArXiv，返回最多 max 篇相关论文 */
export async function searchArxiv(query: string, max = 6): Promise<Paper[]> {
  const params = new URLSearchParams({
    search_query: `all:${query}`,
    start: "0",
    max_results: String(max),
    sortBy: "relevance",
  });

  const res = await fetch(`${ARXIV_API}?${params.toString()}`, {
    headers: { Accept: "application/atom+xml" },
  });

  if (!res.ok) {
    throw new Error(`ArXiv API 返回 ${res.status}`);
  }

  const xml = await res.text();
  const entries = xml.split(/<entry>/).slice(1);
  const papers: Paper[] = [];

  for (const entry of entries) {
    const title = decodeEntities(
      stripTags(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
    );
    const abstract = decodeEntities(
      stripTags(entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? ""),
    );
    const rawId = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() ?? "";
    const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1] ?? "";
    const year = Number(published.match(/\d{4}/)?.[0]) || new Date().getFullYear();
    const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) =>
      decodeEntities(stripTags(m[1])),
    );

    if (!title) continue;

    papers.push({
      id: rawId || `arxiv-${papers.length}`,
      title,
      authors: authors.slice(0, 4),
      year,
      venue: "arXiv",
      abstract,
      url: rawId,
    });

    if (papers.length >= max) break;
  }

  return papers;
}
