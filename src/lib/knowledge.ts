// 本地知识库核心：文档切片 + 关键词倒排索引 + BM25 轻量检索。
// 不依赖向量数据库/嵌入 API，文件持久化到 data/knowledge.json；
// 可整体替换为 ChromaDB（向量检索）而不影响上层接口。

import { promises as fs } from "fs";
import path from "path";
import type { KnowledgeDoc, LocalChunk } from "@/lib/types";

interface Chunk {
  docId: string;
  docTitle: string;
  index: number;
  text: string;
}

// 数据目录可配置：本地默认 <项目>/data，部署时可挂载持久卷（如 Railway Volume）并设置 DATA_DIR
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "knowledge.json");

// ------- 内存态（运行时真相源） -------
let docs: KnowledgeDoc[] = [];
let chunks: Chunk[] = [];
let chunkTokens: string[][] = []; // 与 chunks 平行
let index: Map<string, number[]> = new Map(); // token -> chunk 下标
let loaded = false;

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as { docs?: KnowledgeDoc[]; chunks?: Chunk[] };
    docs = parsed.docs ?? [];
    chunks = parsed.chunks ?? [];
  } catch {
    docs = [];
    chunks = [];
  }
  rebuildIndex();
  loaded = true;
}

function rebuildIndex(): void {
  index = new Map();
  chunkTokens = chunks.map((c) => tokenize(c.text));
  chunkTokens.forEach((tokens, i) => {
    for (const t of new Set(tokens)) {
      const arr = index.get(t) ?? [];
      arr.push(i);
      index.set(t, arr);
    }
  });
}

async function persist(): Promise<void> {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify({ docs, chunks }, null, 2), "utf-8");
  } catch {
    // 只读文件系统（如 Vercel Serverless）时，保持内存态可用
  }
}

// ------- 公开接口 -------

export async function ingestDocument(
  title: string,
  source: string,
  text: string,
  size: number,
): Promise<KnowledgeDoc> {
  await ensureLoaded();

  // 覆盖同名文档：先移除旧版本
  docs = docs.filter((d) => d.title !== title);
  chunks = chunks.filter((c) => c.docTitle !== title);

  const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const docChunks = chunkText(text);
  const doc: KnowledgeDoc = {
    id,
    title,
    source,
    chunks: docChunks.length,
    size,
    ingestedAt: Date.now(),
  };

  docs.push(doc);
  docChunks.forEach((tc, i) => chunks.push({ docId: id, docTitle: title, index: i, text: tc }));
  rebuildIndex();
  await persist();
  return doc;
}

export async function listDocuments(): Promise<KnowledgeDoc[]> {
  await ensureLoaded();
  return [...docs].sort((a, b) => b.ingestedAt - a.ingestedAt);
}

export async function removeDocument(id: string): Promise<void> {
  await ensureLoaded();
  docs = docs.filter((d) => d.id !== id);
  chunks = chunks.filter((c) => c.docId !== id);
  rebuildIndex();
  await persist();
}

export async function clearDocuments(): Promise<void> {
  await ensureLoaded();
  docs = [];
  chunks = [];
  chunkTokens = [];
  index = new Map();
  await persist();
}

export async function searchLocal(query: string, topK = 5): Promise<LocalChunk[]> {
  await ensureLoaded();
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0 || chunks.length === 0) return [];

  // 候选：命中的 chunk 下标
  const candidates = new Set<number>();
  for (const t of qTokens) {
    for (const ci of index.get(t) ?? []) candidates.add(ci);
  }

  const scored: { ci: number; score: number }[] = [];
  for (const ci of candidates) {
    const tf = new Map<string, number>();
    for (const t of chunkTokens[ci]) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const qt of qTokens) score += tf.get(qt) ?? 0;
    if (score > 0) scored.push({ ci, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(({ ci, score }) => {
    const c = chunks[ci];
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
