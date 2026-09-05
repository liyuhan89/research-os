// SSE 流式研究接口：接收用户问题，返回多智能体研究流水线的事件流。
// POST 不会被缓存；通过 ReadableStream 逐事件推送给前端。

import { runResearch } from "@/agents/orchestrator";
import type { ResearchRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: ResearchRequest;
  try {
    body = (await req.json()) as ResearchRequest;
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return Response.json({ error: "缺少 query 字段" }, { status: 400 });
  }
  const steering = body.steering?.trim() || undefined;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        for await (const event of runResearch(query, steering)) {
          send(event);
        }
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "未知错误",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
