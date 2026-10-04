// 自定义注册接口：Credentials provider 不含注册，此处负责校验 + 建号。

import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string; name?: string };
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const name = body.name?.trim() || undefined;

  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: "邮箱格式不正确" }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  let existing: { id: string } | null;
  try {
    existing = await prisma.user.findUnique({ where: { email } });
  } catch {
    return Response.json({ error: "数据库未连接，请检查 DATABASE_URL" }, { status: 503 });
  }
  if (existing) {
    return Response.json({ error: "该邮箱已注册" }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);
  try {
    const user = await prisma.user.create({ data: { email, passwordHash, name } });
    return Response.json(
      { ok: true, user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 },
    );
  } catch {
    return Response.json({ error: "数据库写入失败，请稍后重试" }, { status: 503 });
  }
}
