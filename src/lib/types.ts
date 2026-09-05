// 共享类型：客户端与服务端共同使用（不可在此引入 server-only 依赖）

export type AgentName =
  | "planner"
  | "searcher"
  | "reader"
  | "critic"
  | "writer";

export type Phase =
  | "planning"
  | "searching"
  | "reading"
  | "critiquing"
  | "writing"
  | "done";

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  abstract: string;
  url: string;
  citations?: number;
  limitations?: string;
}

export type Grade = "A" | "B" | "C";

export interface Evidence {
  paperId: string;
  grade: Grade;
  score: number; // 0 - 100
  reason: string;
}

/** 研究空白：由论文 Limitations 推断出的未来可研究方向 */
export interface ResearchGap {
  id: string;
  title: string;
  description: string;
  sources: string[]; // 依据的论文 id
}

/** 本地知识库文档元信息 */
export interface KnowledgeDoc {
  id: string;
  title: string;
  source: string; // 原始文件名
  chunks: number; // 切片数
  size: number; // 字节数
  ingestedAt: number; // 时间戳
}

/** 本地知识库检索命中的切片 */
export interface LocalChunk {
  docId: string;
  docTitle: string;
  chunkIndex: number;
  text: string;
  score: number;
}

export interface GraphNode {
  id: string;
  label: string;
  group: "paper" | "concept";
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface PlanStep {
  id: string;
  agent: AgentName;
  title: string;
  status: "pending" | "running" | "done";
}

/** 后端推送给前端的 SSE 事件（对应研究流水线的每个阶段） */
export type ResearchEvent =
  | { type: "phase"; phase: Phase; message: string }
  | { type: "plan"; steps: PlanStep[] }
  | { type: "step"; stepId: string; status: "running" | "done"; detail?: string }
  | { type: "papers"; papers: Paper[] }
  | { type: "scores"; evidence: Evidence[] }
  | { type: "controversy"; message: string }
  | { type: "gaps"; gaps: ResearchGap[] }
  | { type: "relevance"; score: number; matched: number; total: number; relevant: boolean }
  | { type: "retry"; attempt: number; original: string; rewritten: string; reason: string }
  | { type: "local_hits"; chunks: LocalChunk[] }
  | { type: "tool_call"; name: string; args: Record<string, unknown>; result: string }
  | { type: "report_delta"; text: string }
  | { type: "graph"; nodes: GraphNode[]; edges: GraphEdge[] }
  | { type: "done"; report: string }
  | { type: "error"; message: string };

export interface ResearchRequest {
  query: string;
  mode?: "fast" | "research";
  steering?: string; // 人机协同：研究中途插入的指令
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** 前端聊天面板中的一条消息 */
export interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}
