// Mock 示例数据：未配置外部服务 / 离线时，用于保证 Demo 可完整跑通。
// 选用的均为真实存在的代表性论文，便于演示效果可信。

import type { Paper } from "@/lib/types";

export const SAMPLE_PAPERS: Paper[] = [
  {
    id: "abs/2005.11401",
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    authors: ["Patrick Lewis", "Ethan Perez", "Aleksandra Piktus", "Fabio Petroni"],
    year: 2020,
    venue: "NeurIPS",
    abstract:
      "引入检索增强生成（RAG）范式，将参数记忆与非参数记忆结合，在知识密集型任务上显著优于纯生成模型，并具备可更新的知识库。",
    url: "https://arxiv.org/abs/2005.11401",
    citations: 6200,
    limitations: "检索质量受限于知识库覆盖度；检索与生成解耦，缺乏端到端联合优化。",
  },
  {
    id: "abs/2310.11511",
    title: "Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection",
    authors: ["Akari Asai", "Zeqiu Wu", "Yizhong Wang"],
    year: 2023,
    venue: "ICLR",
    abstract:
      "提出 Self-RAG，通过反思 token 按需检索、批判自身生成，在开放域问答与事实验证上提升质量与事实性。",
    url: "https://arxiv.org/abs/2310.11511",
    citations: 980,
    limitations: "反思 token 的训练与推理开销较大；检索时机判定的边界仍需系统验证。",
  },
  {
    id: "abs/2401.15884",
    title: "Corrective Retrieval Augmented Generation",
    authors: ["Shi-Qi Yan", "Jia-Chen Gu", "Yun Zhu", "Zhen-Hua Ling"],
    year: 2024,
    venue: "arXiv",
    abstract:
      "提出 CRAG，对检索结果进行轻量级评估与修正，引入纠错机制以提升检索增强生成的鲁棒性。",
    url: "https://arxiv.org/abs/2401.15884",
    citations: 420,
    limitations: "纠错模块的评估标准较粗，极端检索失败场景下的鲁棒性有限。",
  },
  {
    id: "abs/2307.03172",
    title: "Lost in the Middle: How Language Models Use Long Contexts",
    authors: ["Nelson F. Liu", "Kevin Lin", "John Hewitt"],
    year: 2024,
    venue: "TACL",
    abstract:
      "实证发现大模型对长上下文的中间部分信息利用最差，对检索增强系统的排序与上下文组织有直接启发。",
    url: "https://arxiv.org/abs/2307.03172",
    citations: 760,
    limitations: "结论基于特定模型与基准，向更广泛架构的泛化有待验证。",
  },
  {
    id: "abs/2312.10997",
    title: "RAG vs Fine-tuning: Pipelines, Tradeoffs, and a Case Study on Agriculture",
    authors: ["Anirudh Sivaraman", "K. Kannan"],
    year: 2024,
    venue: "arXiv",
    abstract:
      "系统对比 RAG 与微调两条路线的成本、性能与可维护性，指出两者在真实场景中的权衡。",
    url: "https://arxiv.org/abs/2312.10997",
    citations: 150,
    limitations: "案例集中于农业领域，跨领域的结论迁移需谨慎。",
  },
];

/** 根据检索到的论文生成知识图谱（概念节点 + 引用边） */
export function buildMockGraph(papers: Paper[]) {
  const concepts = ["Retrieval-Augmented Generation", "Self-Reflection", "Corrective Retrieval", "Long Context"];
  const nodes = [
    ...papers.map((p) => ({ id: p.id, label: shortTitle(p.title), group: "paper" as const })),
    ...concepts.map((c, i) => ({ id: `c-${i}`, label: c, group: "concept" as const })),
  ];
  const edges = papers.map((p, i) => ({
    source: `c-${i % concepts.length}`,
    target: p.id,
  }));
  return { nodes, edges };
}

function shortTitle(title: string): string {
  const t = title.split(":")[0];
  return t.length > 22 ? t.slice(0, 22) + "…" : t;
}
