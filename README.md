# ResearchOS — 智能科研助手

> 让 AI 像资深研究员一样工作：自主规划研究路径、批判性阅读文献、发现研究空白，并生成带权威引用的综述报告。

面向「全国高校 AI Web 开发挑战赛」的参赛项目。核心理念不是做一个「问答机器人」，而是构建一个**多智能体科研操作系统**——把「规划 → 检索 → 阅读 → 评审 → 撰写」五个研究阶段交给五个协作的 AI Agent，实时可视化其思考过程。

---

## ✨ 核心特性

- **多智能体协作流水线**：规划 / 检索 / 阅读 / 评审 / 撰写 五个 Agent 分工协作（AI 深度）
- **CRAG 自我修正检索**：相关性不足时自动重写查询并重试，提升检索质量（AI 深度）
- **自主工具调用**：Agent 根据问题自主调用计算器 / 时间 / ArXiv 等工具（AI 深度）
- **实时「思考流」可视化**：前端实时展示每个 Agent 正在做什么（创新点）
- **证据可信度分级 + 学术争议检测**：借鉴 JARVIS 思想，对论文分级并高亮结论冲突（创新点）
- **研究空白挖掘**：汇总各论文 Limitations，自动推断「未来可研究方向」（原创杀手锏）
- **带内联引用的结构化报告**：生成 `[1][2]` 脚注引用式综述，含「未来研究方向」（实用价值）
- **本地知识库**：上传自己的 txt/md/pdf 文档，研究时优先基于本地文献作答（实用价值 / 社会价值）
- **人机协同**：研究中途插入指令实时调整方向，或随时停止（创新点 / 用户体验）
- **真实工具调用**：ArXiv API + 本地知识库检索 + DeepSeek 流式生成
- **玻璃态沉浸式驾驶舱**：深色科技感 UI，三栏布局，Markdown 报告排版（前端质量 / 用户体验）
- **开箱即用**：未配置 API Key 时自动进入 Mock 模式，`npm run dev` 即可完整体验

## 🚀 快速开始

```bash
npm install
npm run dev
```

打开 http://localhost:3000 ，输入研究问题（如「RAG 技术最新进展」）即可体验。

### 切换到真实 DeepSeek 模型

```bash
cp .env.example .env.local
# 编辑 .env.local，填入 DEEPSEEK_API_KEY
npm run dev
```

配置后，规划 Agent 与撰写 Agent 会调用真实大模型；检索 Agent 会调用真实 ArXiv API。

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 16（App Router）、React 19、TypeScript、Tailwind CSS v4 |
| 流式 | SSE（Server-Sent Events）+ ReadableStream |
| AI 编排 | 自研多 Agent 流水线（可替换为 LangGraph.js） |
| 大模型 | DeepSeek（OpenAI 兼容协议） |
| 工具 | ArXiv API（免密钥） |
| PDF 解析 | pdfjs-dist |
| 本地检索 | 自研 BM25 关键词索引（可升级 ChromaDB 向量检索） |
| 报告渲染 | react-markdown + remark-gfm |

## 📁 目录结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 驾驶舱入口
│   ├── globals.css             # 玻璃态主题 + 动画
│   └── api/
│       ├── research/route.ts   # SSE 研究接口（核心）
│       └── health/route.ts     # 模型状态检测
├── agents/                     # 多 Agent 模块（服务端）
│   ├── orchestrator.ts         # 主控编排器（五阶段流水线）
│   ├── planner.ts              # 规划 Agent
│   ├── searcher.ts             # 检索 Agent
│   ├── reader.ts               # 阅读 Agent
│   ├── critic.ts               # 评审 Agent（证据分级 + 争议检测）
│   └── writer.ts               # 撰写 Agent（流式报告）
├── components/
│   ├── ui/                     # 玻璃组件 + Markdown 渲染
│   └── cockpit/                # 驾驶舱（侧边栏/聊天/思考流/图谱/报告）
└── lib/
    ├── llm.ts                  # DeepSeek 适配器 + Mock 回退
    ├── types.ts                # 共享类型（事件契约）
    ├── mock.ts                 # 示例数据
    └── tools/arxiv.ts          # ArXiv 检索工具
```

## 📚 文档

- [架构设计](docs/ARCHITECTURE.md) — 系统架构与数据流
- [评分对照](docs/COMPETITION.md) — 如何逐一命中比赛评分标准
- [开发路线图](docs/ROADMAP.md) — 8 周备赛冲刺计划
- [部署指南](docs/DEPLOY.md) — Vercel / Railway 部署

## ⚖️ 关于借鉴与原创

本项目架构参考了开源社区的优秀实践（`academic-research-assistant` 的多智能体思想、`RLM-Agent` 的证据分级、`browser-ai-research-agent` 的浏览器交互、`JARVIS` 的评审机制），但**所有代码均为本项目原创实现**，并将「实时思考流可视化」与「研究空白挖掘」作为原创差异化能力。
