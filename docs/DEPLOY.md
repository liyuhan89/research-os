# 部署指南

## 本地运行

```bash
npm install
npm run dev          # 开发模式（热更新）
npm run build && npm run start   # 生产模式
```

## 方案一：Railway（推荐，支持本地知识库持久化）

Railway 运行**单个常驻 Node 进程**，本地知识库（文件 + 内存索引）可正常持久化。项目已内置 [railway.json](../railway.json)（构建 / 启动 / 健康检查配置）。

### 部署步骤

1. 把代码推送到 GitHub。
2. 在 [Railway](https://railway.app) 新建项目 → **Deploy from GitHub repo**，选择本仓库（自动识别 Next.js，`railway.json` 已配好 `npm run build` / `npm run start` / 健康检查 `/api/health`）。
3. 在 **Variables** 中添加环境变量：
   - `DEEPSEEK_API_KEY`（必填，你的真实密钥）
   - `DEEPSEEK_MODEL`（可选，默认 `deepseek-chat`）
4. 部署完成后获得公网 URL。

### 让本地知识库「持久」：挂载卷（关键）

Railway 默认文件系统是**临时的**（每次部署重建），本地知识库会丢。做法：

1. 在项目里新建 **Volume**（Add Volume），挂载路径填 `/data`。
2. 添加环境变量 `DATA_DIR=/data`（代码已支持，见 `src/lib/knowledge.ts`）。
3. 重新部署后，上传的文档写入持久卷，重启 / 重新部署都不丢。

> 若不挂载卷，本地知识库在每次重新部署后会清空（但 AI 能力不受影响）。

## 方案二：Vercel（最快获得公网链接，但本地知识库不跨请求持久）

Vercel 为 Serverless 架构，每次请求是独立实例：

- **本地知识库**（文件 + 内存索引）**不会跨请求持久**——上传后下次请求可能丢失。
- 若需要本地知识库，请改用 Railway，或在 Vercel 上接入外部存储（如 ChromaDB Cloud / Upstash Vector）。

1. 推送代码到 GitHub，Vercel 导入仓库（自动识别 Next.js，无需 `vercel.json`）。
2. 设置环境变量 `DEEPSEEK_API_KEY`（可选）。
3. 部署即得 `https://xxx.vercel.app`。

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 否 | 配置后切换到真实大模型；不设则 Mock 模式 |
| `DEEPSEEK_MODEL` | 否 | 默认 `deepseek-chat`，可换 `deepseek-reasoner` |

## 建议

- **比赛演示**：用 Railway 部署，既能得公网链接，又能完整展示本地知识库。
- **答辩加分**：演示「上传自己的 PDF → 基于本地文献生成综述」是实用性/社会价值的最佳证明。
