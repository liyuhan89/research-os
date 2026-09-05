// 检索 Agent：优先调用 ArXiv 真实 API，失败/无结果时回退到示例数据。
// 此处预留了「向量检索 + 联网搜索」的接入点，可后续扩展为混合检索。

import { searchArxiv } from "@/lib/tools/arxiv";
import { SAMPLE_PAPERS } from "@/lib/mock";
import type { Paper } from "@/lib/types";

export async function search(query: string): Promise<Paper[]> {
  try {
    const papers = await searchArxiv(query, 6);
    if (papers.length > 0) return papers;
  } catch {
    // 离线或解析失败时回退到 Mock
  }
  return SAMPLE_PAPERS;
}
