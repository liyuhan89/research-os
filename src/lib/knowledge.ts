// 本地知识库核心：文档切片 + 关键词倒排索引 + BM25 轻量检索（按用户隔离）。
// 不依赖向量数据库/嵌入 API；文档与切片文本持久化到 PostgreSQL（KnowledgeDoc 表），
// 运行时按 userId 缓存在内存 Map 中。检索逻辑（tokenize/chunkText/BM25）保持不变。

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { KnowledgeDoc, LocalChunk } from "@/lib/types";

interface Chunk {
  docId: string;
  docTitle: string;
  index: number;
  text: string;
}

interface StoredChunk {
  index: number;
  text: string;
}

interface UserState {
  docs: KnowledgeDoc[];
  chunks: Chunk[];
  chunkTokens: string[][]; // 与 chunks 平行
  index: Map<string, number[]>; // token -> chunk 下标
}

// ------- 内存态（运行时真相源，按用户缓存） -------
const states = new Map<string, UserState>();

function emptyState(): UserState {
  return { docs: [], chunks: [], chunkTokens: [], index: new Map() };
}

async function ensureLoaded(userId: string): Promise<UserState> {
  const cached = states.get(userId);
  if (cached) return cached;

  const state = emptyState();
  try {
    const rows = await prisma.knowledgeDoc.findMany({
      where: { userId },
      orderBy: { ingestedAt: "desc" },
    });
    for (const row of rows) {
      const stored = (row.chunks as unknown as StoredChunk[]) ?? [];
      state.docs.push({
        id: row.id,
        title: row.title,
        source: row.source,
        chunks: stored.length,
        size: row.size,
        ingestedAt: row.ingestedAt.getTime(),
      });
      for (const c of stored) {
        state.chunks.push({ docId: row.id, docTitle: row.title, index: c.index, text: c.text });
      }
    }
  } catch {
    // 数据库不可用（如本地未配置 DATABASE_URL）时保持空态，进程内仍可用
  }
  rebuildIndex(state);
  states.set(userId, state);
  return state;
}

function rebuildIndex(state: UserState): void {
  state.index = new Map();
  state.chunkTokens = state.chunks.map((c) => tokenize(c.text));
  state.chunkTokens.forEach((tokens, i) => {
    for (const t of new Set(tokens)) {
      const arr = state.index.get(t) ?? [];
      arr.push(i);
      state.index.set(t, arr);
    }
  });
}

// ------- 公开接口（首个参数均为 userId） -------

export async function ingestDocument(
  userId: string,
  title: string,
  source: string,
  text: string,
  size: number,
): Promise<KnowledgeDoc> {
  const state = await ensureLoaded(userId);

  // 覆盖同名文档：先移除旧版本
  const existing = state.docs.find((d) => d.title === title);
  if (existing) {
    await prisma.knowledgeDoc.deleteMany({ where: { id: existing.id, userId } }).catch(() => {});
    state.docs = state.docs.filter((d) => d.id !== existing.id);
    state.chunks = state.chunks.filter((c) => c.docId !== existing.id);
  }

  const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const docChunks = chunkText(text);
  const stored: StoredChunk[] = docChunks.map((tc, i) => ({ index: i, text: tc }));

  await prisma.knowledgeDoc
    .create({ data: { id, userId, title, source, chunks: stored as unknown as Prisma.InputJsonValue, size } })
    .catch(() => {});

  const doc: KnowledgeDoc = {
    id,
    title,
    source,
    chunks: docChunks.length,
    size,
    ingestedAt: Date.now(),
  };
  state.docs.push(doc);
  docChunks.forEach((tc, i) => state.chunks.push({ docId: id, docTitle: title, index: i, text: tc }));
  rebuildIndex(state);
  return doc;
}

export async function listDocuments(userId: string): Promise<KnowledgeDoc[]> {
  const state = await ensureLoaded(userId);
  return [...state.docs].sort((a, b) => b.ingestedAt - a.ingestedAt);
}

export async function removeDocument(userId: string, id: string): Promise<void> {
  const state = await ensureLoaded(userId);
  await prisma.knowledgeDoc.deleteMany({ where: { id, userId } }).catch(() => {});
  state.docs = state.docs.filter((d) => d.id !== id);
  state.chunks = state.chunks.filter((c) => c.docId !== id);
  rebuildIndex(state);
}

export async function clearDocuments(userId: string): Promise<void> {
  const state = await ensureLoaded(userId);
  await prisma.knowledgeDoc.deleteMany({ where: { userId } }).catch(() => {});
  state.docs = [];
  state.chunks = [];
  state.chunkTokens = [];
  state.index = new Map();
}

export async function searchLocal(userId: string, query: string, topK = 5): Promise<LocalChunk[]> {
  const state = await ensureLoaded(userId);
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0 || state.chunks.length === 0) return [];

  // 候选：命中的 chunk 下标
  const candidates = new Set<number>();
  for (const t of qTokens) {
    for (const ci of state.index.get(t) ?? []) candidates.add(ci);
  }

  const scored: { ci: number; score: number }[] = [];
  for (const ci of candidates) {
    const tf = new Map<string, number>();
    for (const t of state.chunkTokens[ci]) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const qt of qTokens) score += tf.get(qt) ?? 0;
    if (score > 0) scored.push({ ci, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(({ ci, score }) => {
    const c = state.chunks[ci];
    return {
      docId: c.docId,
      docTitle: c.docTitle,
      chunkIndex: c.index,
      text: c.text.length > 400 ? c.text.slice(0, 400) + "…" : c.text,
      score,
    };
  });
}

// ------- 分词与切片 -------

/** 英文单词 + 中文二元组分词（无外部分词器） */
function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const en = lower.match(/[a-z0-9]{2,}/g) ?? [];
  const zhRuns = text.match(/[一-龥]+/g) ?? [];
  const bigrams: string[] = [];
  for (const run of zhRuns) {
    for (let i = 0; i < run.length - 1; i++) bigrams.push(run.slice(i, i + 2));
  }
  return [...en, ...bigrams];
}

/** 按段落切片，接近 maxChars，避免长段落过长 */
function chunkText(text: string, maxChars = 800): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n\s*\n/).filter((p) => p.trim());
  const result: string[] = [];
  let buf = "";

  for (const p of paragraphs) {
    if (buf && (buf + p).length > maxChars) {
      result.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
    while (buf.length > maxChars) {
      result.push(buf.slice(0, maxChars));
      buf = buf.slice(maxChars);
    }
  }
  if (buf.trim()) result.push(buf.trim());
  return result;
}
