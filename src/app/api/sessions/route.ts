// 当前用户的研究会话 CRUD（按用户隔离）。
// GET 列表 / POST 创建或更新（upsert）/ DELETE 按 id 删除。

import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { Session, UIMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  title: string;
  messages: unknown;
  updatedAt: Date;
  createdAt: Date;
}

function toSession(row: Row): Session {
  return {
    id: row.id,
    title: row.title,
    messages: (row.messages as UIMessage[]) ?? [],
    updatedAt: row.updatedAt.getTime(),
    createdAt: row.createdAt.getTime(),
  };
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "未登录" }, { status: 401 });

  const rows = await prisma.researchSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json({ sessions: rows.map(toSession) });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "未登录" }, { status: 401 });

  let body: { id?: string; title?: string; messages?: UIMessage[] };
  try {
    body = (await req.json()) as { id?: string; title?: string; messages?: UIMessage[] };
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const id = body.id?.trim();
  const title = body.title?.trim() || "新研究";
  const messages = (Array.isArray(body.messages) ? body.messages : []) as unknown as Prisma.InputJsonValue;

  if (id) {
    const existing = await prisma.researchSession.findUnique({ where: { id } });
    if (existing && existing.userId !== userId) {
      return Response.json({ error: "无权操作该会话" }, { status: 403 });
    }
    if (existing) {
      const updated = await prisma.researchSession.update({
        where: { id },
        data: { title, messages },
      });
      return Response.json({ session: toSession(updated) });
    }
    const created = await prisma.researchSession.create({
      data: { id, userId, title, messages },
    });
    return Response.json({ session: toSession(created) });
  }

  const created = await prisma.researchSession.create({
    data: { userId, title, messages },
  });
  return Response.json({ session: toSession(created) });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "未登录" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "缺少 id" }, { status: 400 });

  await prisma.researchSession.deleteMany({ where: { id, userId } });
  return Response.json({ ok: true });
}
