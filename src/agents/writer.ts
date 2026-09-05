// 撰写 Agent：基于检索结果、证据分级、研究空白、本地知识库与协同指令，
// 流式生成带内联引用的结构化综述。
// 真实模式调用 DeepSeek 流式输出；Mock 模式输出示例报告。

import { delay, isConfigured, streamChat } from "@/lib/llm";
import type { Evidence, LocalChunk, Paper, ResearchGap } from "@/lib/types";
import type { ReadingNote } from "@/agents/reader";

export interface WriteInput {
  query: string;
  papers: Paper[];
  evidence: Evidence[];
  notes: ReadingNote[];
  gaps: ResearchGap[];
  localChunks: LocalChunk[];
  steering?: string;
}

export async function* write(input: WriteInput): AsyncGenerator<string> {
  if (isConfigured()) {
    yield* writeWithLLM(input);
    return;
  }
  yield* mockReport(input);
}

async function* writeWithLLM(input: WriteInput): AsyncGenerator<string> {
  const refs = input.papers
    .map((p, i) => `[${i + 1}] ${p.title}（${p.year}, ${p.venue}）`)
    .join("\n");
  const grades = input.evidence
    .map((e) => `[${e.grade}] ${e.paperId} — ${e.reason}`)
    .join("\n");
  const gaps = input.gaps
    .map((g, i) => `${i + 1}. ${g.title}：${g.description}`)
    .join("\n");
  const local = input.localChunks
    .map((c) => `- 《${c.docTitle}》：${c.text.slice(0, 200)}`)
    .join("\n");
  const steering = input.steering
    ? `\n用户协同指令（请严格遵守，聚焦/缩小研究范围）：\n${input.steering}`
    : "";

  const prompt = `你是资深科研综述撰写者。请基于以下论文、证据分级、研究空白与本地知识库，撰写一份结构化中文综述，使用 [编号] 内联引用。
结构：摘要 / 核心发现 / 争议分析 / 未来研究方向 / 参考文献。

研究问题：${input.query}

论文列表：
${refs}

证据分级：
${grades}

研究空白（请纳入「未来研究方向」）：
${gaps || "（无）"}
${steering}

本地知识库片段（如与问题相关，请优先参考并标注「据本地文献」）：
${local || "（无）"}`;

  yield* streamChat([
    {
      role: "system",
      content: "你是严谨的学术综述助手，输出 Markdown，使用 [编号] 内联引用，语言精炼专业。",
    },
    { role: "user", content: prompt },
  ]);
}

async function* mockReport(input: WriteInput): AsyncGenerator<string> {
  const report = buildMockReport(input.query, input.gaps, input.localChunks, input.steering);
  // 按小块流式吐出，模拟真实 token 生成
  const chunkSize = 4;
  for (let i = 0; i < report.length; i += chunkSize) {
    yield report.slice(i, i + chunkSize);
    await delay(20);
  }
}

function buildMockReport(
  query: string,
  gaps: ResearchGap[],
  localChunks: LocalChunk[],
  steering?: string,
): string {
  const future = gaps.length
    ? gaps.map((g, i) => `${i + 1}. **${g.title}**：${g.description}`).join("\n")
    : "1. （基于现有论文的局限，可进一步挖掘未来方向）";

  const localSection = localChunks.length
    ? `\n### 本地文献依据\n${localChunks
        .map((c, i) => `${i + 1}. 《${c.docTitle}》：${c.text.slice(0, 120)}…`)
        .join("\n")}`
    : "";

  const steeringNote = steering ? `\n> 协同指令：${steering}\n` : "";

  return `## 综述：${query}
${steeringNote}
### 摘要
围绕「${query}」这一主题，本报告系统梳理了检索增强生成（RAG）技术的研究脉络与最新进展。经多智能体协作，共检索并深度阅读 5 篇代表性论文，完成可信度分级、争议分析与研究空白挖掘。

### 核心发现
1. **范式确立**：RAG 将参数记忆与非参数记忆结合，在知识密集型任务上显著优于纯生成模型 [1]。
2. **自我反思增强**：Self-RAG 通过反思 token 实现按需检索与生成批判，显著提升事实性 [2]。
3. **纠错机制**：CRAG 对检索结果进行轻量级评估与修正，增强管线鲁棒性 [3]。
4. **上下文排序敏感**：模型对长上下文中间部分的信息利用最差，检索结果的排序直接影响生成质量 [4]。
5. **路线权衡**：RAG 与微调各有优劣，选择取决于成本、性能与可维护性 [5]。

### 争议分析
⚠️ **检索的增益 vs 排序的代价**：RAG 系列论文强调检索带来的知识增强 [1][2]，而 [4] 指出长上下文中信息位置显著影响效果——检索结果若未精心排序，增益可能被抵消。这一张力是当前社区讨论的焦点。

### 未来研究方向（研究空白挖掘）
${future}
${localSection}
### 参考文献
[1] Lewis et al., 2020, NeurIPS — Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks.
[2] Asai et al., 2023, ICLR — Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection.
[3] Yan et al., 2024 — Corrective Retrieval Augmented Generation.
[4] Liu et al., 2024, TACL — Lost in the Middle: How Language Models Use Long Contexts.
[5] Sivaraman et al., 2024 — RAG vs Fine-tuning: Pipelines, Tradeoffs, and a Case Study on Agriculture.
`;
}
