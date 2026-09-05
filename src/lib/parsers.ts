// 文件解析器：把上传的文件提取为纯文本。
// .txt / .md 直接读取；.pdf 用官方 pdfjs-dist 解析（运行时动态加载）。

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
  // 动态加载，避免影响首屏与服务端 bundle 体积
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    verbosity: 0,
  }).promise;

  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = (content.items as Array<{ str?: string }>)
      .map((item) => (typeof item.str === "string" ? item.str : ""))
      .join(" ");
    parts.push(text);
  }
  return parts.join("\n");
}
