// 健康检查：前端据此展示「真实模型 / Mock 模式」，不暴露任何密钥。

import { isConfigured, modelName } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    configured: isConfigured(),
    model: modelName(),
  });
}
