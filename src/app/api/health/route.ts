// 健康检查：前端据此展示「真实模型 / Mock 模式」，不暴露任何密钥。
// 附带 diag 诊断字段（只含变量名/长度/Railway 标识，绝不含密钥值），用于排查部署环境。

import { isConfigured, modelName } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.DEEPSEEK_API_KEY;
  const allEnvNames = Object.keys(process.env).sort();

  return Response.json({
    configured: isConfigured(),
    model: modelName(),
    diag: {
      hasKey: Boolean(key),
      keyLen: key ? key.length : 0,
      envCount: allEnvNames.length,
      // 所有环境变量名（无值，绝不含密钥），用于核对哪些变量真的进了运行时
      allEnvNames,
      // 用于核对「变量到底加在哪个项目 / 服务 / 环境」
      projectName: process.env.RAILWAY_PROJECT_NAME ?? null,
      projectId: process.env.RAILWAY_PROJECT_ID ?? null,
      serviceName: process.env.RAILWAY_SERVICE_NAME ?? null,
      serviceId: process.env.RAILWAY_SERVICE_ID ?? null,
      environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? null,
    },
  });
}
