import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** 用 react-markdown 渲染研究报告，配合 .prose-report 样式 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-report">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
