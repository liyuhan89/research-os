// 健康检查：前端据此展示「真实模型 / Mock 模式」，不暴露任何密钥。
// 附带 diag 诊断字段（只含变量名/长度/Railway 标识，绝不含密钥值），用于排查部署环境。

import { isConfigured, modelName } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.DEEPSEEK_API_KEY;
  // 只取「名称」，且只挑 DEEPSEEK / RAILWAY / NODE 相关，绝不返回任何值
  const envNames = Object.keys(process.env)
    .filter((k) => /^(DEEPSEEK|RAILWAY|NODE_ENV|NODE_VERSION)/i.test(k))
    .sort();

  return Response.json({
    configured: isConfigured(),
    model: modelName(),
    diag: {
      hasKey: Boolean(key),
      keyLen: key ? key.length : 0,
      envCount: Object.keys(process.env).length,
      envNames,
      // 用于核对「变量到底加在哪个服务 / 哪个环境」
      serviceName: process.env.RAILWAY_SERVICE_NAME ?? null,
      serviceId: process.env.RAILWAY_SERVICE_ID ?? null,
      environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? null,
    },
  });
}
