// 主控编排器：串联「规划 -> 检索 -> 阅读 -> 评审 -> 撰写」五阶段研究流水线，
// 每个阶段通过 async generator 实时产出 SSE 事件。

import { plan } from "@/agents/planner";
import { search } from "@/agents/searcher";
import { evaluateRelevance, MAX_RETRIES, mergePapers, rewriteQuery } from "@/agents/retrieval";
import { read } from "@/agents/reader";
import { critique } from "@/agents/critic";
import { mineGaps } from "@/agents/gaps";
import { write } from "@/agents/writer";
import { buildMockGraph } from "@/lib/mock";
import { searchLocal } from "@/lib/knowledge";
import { callTool, detectToolCall } from "@/lib/tools/registry";
import { delay } from "@/lib/llm";
import type { ResearchEvent } from "@/lib/types";

export async function* runResearch(
  query: string,
  steering?: string,
): AsyncGenerator<ResearchEvent> {
  try {
    // 人机协同：中途插入的指令
    if (steering) {
      yield { type: "phase", phase: "planning", message: `🎯 已应用你的协同指令：${steering}` };
      await delay(300);
    }

    // 阶段一：规划
    yield { type: "phase", phase: "planning", message: "🧭 规划 Agent 正在拆解研究任务…" };
    const steps = await plan(query);
    yield { type: "plan", steps };
    await delay(380);

    // 工具调用：根据问题自主决定是否调用外部工具（计算器 / 时间 / ArXiv）
    const toolCall = detectToolCall(query);
    if (toolCall) {
      yield { type: "phase", phase: "planning", message: `🔧 调用工具 ${toolCall.name}…` };
      await delay(250);
      const result = await callTool(toolCall.name, toolCall.args);
      yield { type: "tool_call", name: toolCall.name, args: toolCall.args, result };
    }

    // 阶段二：检索（CRAG 自我修正）
    yield { type: "phase", phase: "searching", message: "🔍 检索 Agent 正在并行检索 ArXiv 与网络…" };
    yield { type: "step", stepId: "step-1", status: "running", detail: "混合检索中" };
    let papers = await search(query);
    yield { type: "papers", papers };

    // CRAG：评估相关性，不足则重写查询并重试
    let currentQuery = query;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const rel = await evaluateRelevance(currentQuery, papers);
      yield {
        type: "relevance",
        score: rel.score,
        matched: rel.matched,
        total: rel.total,
        relevant: rel.relevant,
      };

      if (rel.relevant) break;
      if (attempt >= MAX_RETRIES) {
        yield { type: "phase", phase: "searching", message: "⚠️ 检索相关性仍不足，已按当前最优结果继续。" };
        break;
      }

      const rewritten = await rewriteQuery(currentQuery, attempt);
      yield {
        type: "retry",
        attempt: attempt + 1,
        original: currentQuery,
        rewritten,
        reason: `相关性仅 ${Math.round(rel.score * 100)}%，低于阈值，重写查询重试`,
      };
      await delay(300);
      currentQuery = rewritten;
      const more = await search(currentQuery);
      papers = mergePapers(papers, more);
      yield { type: "papers", papers };
    }
    // 本地知识库检索
    const localChunks = await searchLocal(query, 5);
    if (localChunks.length > 0) {
      yield { type: "local_hits", chunks: localChunks };
    }
    yield {
      type: "step",
      stepId: "step-1",
      status: "done",
      detail: `发现 ${papers.length} 篇论文${localChunks.length ? ` · 本地命中 ${localChunks.length} 条` : ""}`,
    };
    await delay(380);

    // 阶段三：阅读
    yield { type: "phase", phase: "reading", message: "📖 阅读 Agent 正在深度阅读与提取证据…" };
    yield { type: "step", stepId: "step-2", status: "running", detail: "逐篇解析全文" };
    const notes = await read(papers);
    yield { type: "step", stepId: "step-2", status: "done", detail: `已提取 ${notes.length} 篇关键信息` };

    // 阶段四：评审
    yield { type: "phase", phase: "critiquing", message: "🧐 评审 Agent 正在评估证据可信度…" };
    yield { type: "step", stepId: "step-3", status: "running", detail: "可信度分级 + 争议检测" };
    const { evidence, controversy } = await critique(papers);
    yield { type: "scores", evidence };
    if (controversy) yield { type: "controversy", message: controversy };
    yield { type: "step", stepId: "step-3", status: "done", detail: "证据分级完成" };

    // 研究空白挖掘（原创杀手锏）：汇总 Limitations，推断未来方向
    yield { type: "phase", phase: "critiquing", message: "🔬 研究空白挖掘：汇总 Limitations 并推断未来方向…" };
    const gaps = await mineGaps(papers);
    yield { type: "gaps", gaps };

    // 知识图谱
    const { nodes, edges } = buildMockGraph(papers);
    yield { type: "graph", nodes, edges };

    // 阶段五：撰写
    yield { type: "phase", phase: "writing", message: "✍️ 撰写 Agent 正在生成综述报告…" };
    yield { type: "step", stepId: "step-4", status: "running", detail: "带引用结构化生成中" };
    let report = "";
    for await (const delta of write({ query, papers, evidence, notes, gaps, localChunks, steering })) {
      report += delta;
      yield { type: "report_delta", text: delta };
    }
    yield { type: "step", stepId: "step-4", status: "done", detail: "报告生成完成" };

    yield { type: "phase", phase: "done", message: "✅ 研究完成" };
    yield { type: "done", report };
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    yield { type: "error", message };
  }
}
