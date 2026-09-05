// 研究空白挖掘 Agent（原创「杀手锏」）：汇总各论文的 Limitations，
// 推断出「未来可研究方向」。真实模式调用大模型，Mock 模式返回示例空白。

import { chat, delay, isConfigured } from "@/lib/llm";
import type { Paper, ResearchGap } from "@/lib/types";

export async function mineGaps(papers: Paper[]): Promise<ResearchGap[]> {
  await delay(300);

  if (isConfigured()) {
    try {
      const gaps = await mineGapsWithLLM(papers);
      if (gaps.length > 0) return gaps;
    } catch {
      // 解析失败则回退到 Mock
    }
  }
  return mockGaps(papers);
}

async function mineGapsWithLLM(papers: Paper[]): Promise<ResearchGap[]> {
  const refs = papers
    .map((p) => `- ${p.id}：${p.title}（局限：${p.limitations ?? "未标注"}）`)
    .join("\n");

  const raw = await chat([
    {
      role: "system",
      content:
        "你输出严格的 JSON 数组，元素字段：{ title: string, description: string, sources: string[] }。sources 为论文 id 列表。",
    },
    {
      role: "user",
      content: `基于以下论文的 Limitations，推断 3 个有前景的未来研究方向：\n${refs}`,
    },
  ]);

  try {
    const parsed = JSON.parse(extractJson(raw)) as {
      title: string;
      description: string;
      sources?: string[];
    }[];
    return parsed.slice(0, 3).map((g, i) => ({
      id: `gap-${i}`,
      title: g.title,
      description: g.description,
      sources: g.sources ?? [],
    }));
  } catch {
    return [];
  }
}

function mockGaps(papers: Paper[]): ResearchGap[] {
  // 示例语料库的精选研究空白
  if (papers.some((p) => p.id === "abs/2005.11401")) {
    return [
      {
        id: "gap-1",
        title: "自反思检索与纠错检索的融合管线",
        description:
          "Self-RAG 的自反思机制与 CRAG 的纠错检索尚未统一到端到端框架中，融合二者有望同时提升检索质量与生成事实性。",
        sources: ["abs/2310.11511", "abs/2401.15884"],
      },
      {
        id: "gap-2",
        title: "面向长上下文的检索结果重排序策略",
        description:
          "「Lost in the Middle」揭示的信息位置敏感性，与 RAG 检索增益之间存在张力；针对检索片段的排序优化仍是开放问题。",
        sources: ["abs/2307.03172", "abs/2005.11401"],
      },
      {
        id: "gap-3",
        title: "RAG 与微调的动态混合调度",
        description:
          "何时检索、何时微调、何时二者结合，尚缺乏面向成本与性能动态权衡的统一决策框架。",
        sources: ["abs/2312.10997"],
      },
    ];
  }

  // 通用回退：基于标题生成方向
  return papers.slice(0, 3).map((p, i) => ({
    id: `gap-${i}`,
    title: `围绕「${shortTitle(p.title)}」的深化研究`,
    description: `现有研究（${p.venue}, ${p.year}）为本方向奠定基础，但其适用边界与鲁棒性仍需进一步实证检验。`,
    sources: [p.id],
  }));
}

function shortTitle(title: string): string {
  const t = title.split(":")[0];
  return t.length > 24 ? t.slice(0, 24) + "…" : t;
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
