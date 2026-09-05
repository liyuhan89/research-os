import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResearchOS — 智能科研助手",
  description:
    "多智能体科研协作引擎：自主规划研究路径、批判性阅读文献、发现研究空白，并生成带权威引用的综述报告。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
