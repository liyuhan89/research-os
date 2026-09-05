// DeepSeek 大模型适配器（OpenAI 兼容协议），未配置密钥时回退到 Mock。
// 仅被服务端代码（route.ts / agents）引用，切勿在客户端组件中 import。

import type { ChatMessage } from "@/lib/types";

const DEEPSEEK_BASE = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat"; // 通用对话；推理场景可换 "deepseek-reasoner"

/** 是否已配置 DeepSeek API Key（决定走真实调用还是 Mock） */
export function isConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export function modelName(): string {
  return process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;
}

function buildBody(messages: ChatMessage[], stream: boolean, temperature: number) {
  return {
    model: modelName(),
    messages,
    stream,
    temperature,
  };
}

/** 非流式对话 */
export async function chat(
  messages: ChatMessage[],
  opts?: { temperature?: number },
): Promise<string> {
  if (!isConfigured()) {
    return mockCompletion();
  }

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(buildBody(messages, false, opts?.temperature ?? 0.4)),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/** 流式对话（逐 token 产出），用于实时撰写报告 */
export async function* streamChat(
  messages: ChatMessage[],
  opts?: { temperature?: number },
): AsyncGenerator<string> {
  if (!isConfigured()) {
    yield* mockStream();
    return;
  }

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(buildBody(messages, true, opts?.temperature ?? 0.4)),
  });

  if (!res.ok || !res.body) {
    yield await chat(messages, opts);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta: string | undefined = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // 忽略无法解析的行
      }
    }
  }
}

// ------- Mock 回退（未配置密钥时使用，保证 Demo 开箱即用） -------

function mockCompletion(): string {
  return "（未配置 DEEPSEEK_API_KEY，此处为 Mock 占位回复。配置密钥后自动切换为真实大模型输出。）";
}

async function* mockStream(): AsyncGenerator<string> {
  const words = mockCompletion().split("");
  for (const ch of words) {
    yield ch;
    await delay(12);
  }
}

/** 让 Mock 模式有真实的流式节奏 */
export async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
