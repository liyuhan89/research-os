// 本地知识库 REST 接口（按用户隔离）：
// GET    列出已入库文档
// POST   上传并解析（multipart，字段名 "files"）
// DELETE 清空或按 id 删除

import { auth } from "@/auth";
import {
  clearDocuments,
  ingestDocument,
  listDocuments,
  removeDocument,
} from "@/lib/knowledge";
import { parseFile } from "@/lib/parsers";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = (await auth())?.user?.id;
  if (!userId) return Response.json({ error: "未登录" }, { status: 401 });
  const docs = await listDocuments(userId);
  return Response.json({ docs });
}

export async function POST(req: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) return Response.json({ error: "未登录" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "请以 multipart/form-data 上传文件" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => typeof f !== "string");
  if (files.length === 0) {
    return Response.json({ error: "未收到文件（字段名应为 files）" }, { status: 400 });
  }

  const results: Array<{
    name: string;
    ok: boolean;
    doc?: { id: string; title: string; chunks: number };
    error?: string;
  }> = [];

  for (const file of files) {
    const filename = file.name || "未命名文档";
    try {
      const { text } = await parseFile(file, filename);
      if (!text.trim()) {
        results.push({ name: filename, ok: false, error: "未提取到文本内容" });
        continue;
      }
      const doc = await ingestDocument(userId, filename, filename, text, file.size);
      results.push({ name: filename, ok: true, doc: { id: doc.id, title: doc.title, chunks: doc.chunks } });
    } catch (error) {
      results.push({
        name: filename,
        ok: false,
        error: error instanceof Error ? error.message : "解析失败",
      });
    }
  }

  return Response.json({ results });
}

export async function DELETE(req: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) return Response.json({ error: "未登录" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    await removeDocument(userId, id);
  } else {
    await clearDocuments(userId);
  }
  return Response.json({ ok: true });
}
