// 文件解析器：把上传的文件提取为纯文本。
// .txt / .md 直接读取；.pdf 用 unpdf（服务端友好的 pdf.js 封装，正确处理 worker）。

import { extractText } from "unpdf";

export interface ParsedFile {
  text: string;
}

export async function parseFile(file: File, filename: string): Promise<ParsedFile> {
  const ext = filename.includes(".")
    ? filename.toLowerCase().split(".").pop() ?? ""
    : "";

  if (ext === "pdf" || file.type === "application/pdf") {
    return { text: await parsePdf(file) };
  }

  if (["txt", "md", "markdown"].includes(ext) || file.type.startsWith("text/")) {
    return { text: await file.text() };
  }

  throw new Error(`暂不支持 .${ext} 文件类型（支持 txt / md / pdf）`);
}

async function parsePdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  return text;
}
