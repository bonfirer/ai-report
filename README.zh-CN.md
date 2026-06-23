<div align="center">

#  AI Report Platform

**接入数据库，与数据对话，让 AI 帮你生成看板。**

<sub>🤖 AI 驱动的数据分析与报表平台 · 自然语言查询 · 指标库 · 一键生成可交互看板 · 多渠道预警（邮件 / 飞书）</sub>

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-stable-orange?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](#-使用-docker-快速开始推荐)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![i18n](https://img.shields.io/badge/i18n-EN%20%2F%20中文-9cf)](#-功能特性)

[🚀 在线体验](#-在线体验) ·
[⚡ 快速开始](#-使用-docker-快速开始推荐) ·
[✨ 功能特性](#-功能特性) ·
[🏗️ 架构](#️-架构) ·
[📦 部署](#-生产环境部署)

<br/>

[English](README.md) · **简体中文**

</div>

---

## 💡 项目简介

**AI Report Platform** 把一个原始数据库变成可分享、可交互的数据看板 —— 无需手写 SQL，也不必搭建传统 BI 工具。接入 MySQL、PostgreSQL 或 Oracle 后，你可以：

- **用自然语言提问**，助手会自动编写并执行只读 SQL。
- **沉淀指标库**，它同时充当知识库，让 AI 始终贴合你的业务定义。
- **越用越聪明** —— 每次对话都会把你数据库的业务规则教给助手，并在后续提问时召回最相关的那部分。
- **一句话生成完整的 HTML 看板**，通过对话不断优化，并保留完整的版本历史。
- **及时获知变化**：定时快照 + 基于阈值的**预警**，可发送到邮件（附带 Excel 数据文件）和/或推送到**飞书**（交互式消息卡片）。

## 🚀 在线体验

无需安装，直接试用：

<table>
  <tr><td>🌐 <b>网址</b></td><td><a href="https://www.termiio.com:9528">https://www.termiio.com:9528</a></td></tr>
  <tr><td>👤 <b>用户名</b></td><td><code>admin</code></td></tr>
  <tr><td>🔑 <b>密码</b></td><td><code>admin123</code></td></tr>
</table>

> ⚠️ 这是公开的共享演示环境 —— 请勿录入真实凭据或敏感数据，数据可能会被定期重置。若站点使用自签名证书，浏览器可能弹出安全提示，需手动信任后继续访问。

## ✨ 功能特性

| | 能力 | 说明 |
|---|---|---|
| 🔌 | **数据源** | 接入 MySQL、PostgreSQL 或 Oracle；自动解析表结构，并以知识图谱方式可视化表间关系。 |
| 💬 | **AI 对话** | 用自然语言提问，助手会编写并执行**只读** SQL，自动修复失败的查询并解释结果。生成过程运行在服务端，即使你切走页面也会继续。 |
| ⭐ | **指标库** | 把验证过的查询保存为命名的业务指标。指标库同时充当知识库，让 AI 与你的定义保持一致。 |
| 📊 | **AI 看板** | 基于数据一键生成完整、响应式的 HTML 看板（ECharts），通过对话持续优化，并保留可回滚的**版本历史**。 |
| 🔗 | **分享** | 通过不可猜测的分享链接发布报表，支持公开/私有控制。 |
| 📸 | **快照** | 定时采集指标快照，用于趋势、同比、环比对比。 |
| 🔔 | **预警** | 为指标设置阈值规则；触发时按你的定时计划发送一封 **AI 撰写**的邮件，并将指标数据作为 **Excel** 附件携带。 |
| 🪶 | **飞书 / Lark** | 通过自定义机器人 Webhook 把同一条预警推送到飞书群，呈现为交互式消息**卡片**（支持可选的 **HMAC-SHA256 加签**）。每条规则可选择邮件、飞书或两者同时。 |
| 🧠 | **自学习知识** | 每次对话后自动提炼**新增**业务知识（字段含义、表关系、查询套路、业务规则）写入按数据源隔离的知识库；被 👍 的回答会沉淀为 few-shot 示例。这些内容都会**按相关性排序**后回流到后续的 SQL 生成中 —— 越用越准。 |
| 🌍 | **国际化** | 内置中英文界面。 |
| 🔐 | **认证** | 基于 JWT 的鉴权，支持首次运行初始化管理员，并对登录做限流。 |

## 🧠 它如何自我学习

大多数 text-to-SQL 工具问完即忘。AI Report 则会**不断沉淀关于你这套具体数据库的业务知识**，并把它回流到每一次回答里 —— 团队用得越多，它就越准。这份**按数据源隔离、会随使用复利增长**的记忆，正是它区别于"套壳问大模型"的地方。

```
  你 ─ 提问 / 👍 点赞 ─▶  对话
                            │  后台：提炼"新增"的业务知识
                            ▼
  已学习的上下文（按数据源隔离）
    • 知识库 —— 字段含义 · 表关系 · 业务规则 · 查询套路
    • 👍 few-shot 示例
    • 精选指标库
                            │  相关性排序 + token 预算
                            ▼
  有据可依的 SQL 生成 ─▶  下一次回答更好
```

- **自动抽取** —— 每轮对话后，后台任务让 LLM 只提炼*新增*知识，与已知条目去重后按数据源入库（带置信度）。
- **人在回路** —— 对好的回答点 👍，即把它存为下次模型会遵循的 few-shot 示例。
- **精选指标** —— 经过验证的命名指标，作为高可信、可复用的定义。
- **相关性召回** —— 每次新提问时，挑选最相关的知识、示例和指标（按置信度加权、并限制在 token 预算内）注入提示词，既保证有据可依，又不会撑爆上下文。

## 🛠️ 技术栈

| 层 | 技术 |
|-------|------------|
| 🦀 **后端** | Rust · [axum](https://github.com/tokio-rs/axum) · [sqlx](https://github.com/launchbadge/sqlx) · [tokio](https://tokio.rs/) |
| 🗄️ **元数据库** | MySQL / MariaDB |
| 🎯 **被分析数据源** | MySQL · PostgreSQL · Oracle |
| 🤖 **大模型** | 任意 OpenAI 兼容 API（DeepSeek、OpenAI 等） |
| 📧 **邮件 / 文件** | SMTP 基于 [lettre](https://github.com/lettre/lettre) · Excel 基于 [rust_xlsxwriter](https://github.com/jmcnamara/rust_xlsxwriter) |
| 💬 **通知** | 飞书（Lark）自定义机器人 Webhook，支持可选的 HMAC-SHA256 加签 |
| ⚛️ **前端** | React 19 · Vite · TypeScript · Tailwind CSS · Zustand · React Router |

## 🏗️ 架构

```
                    ┌──────────────────────────────────────────────┐
   浏览器 ─HTTPS─▶  │  Nginx                                        │
                    │   ├─ /        →  静态 SPA (client/dist)        │
                    │   └─ /api/*   →  Rust API 服务 (axum :3001)    │
                    └───────────────────────┬──────────────────────┘
                                             │
            ┌────────────────────────────────┼────────────────────────────────┐
            ▼                                ▼                                 ▼
   MySQL / MariaDB                     你的数据源                          大模型服务
   (平台元数据)                    (MySQL · PG · Oracle)              (OpenAI 兼容)
            ▲                                                                  
            │                                                                  
   后台调度器 ─────────────────┬───▶ SMTP 服务器     (预警邮件 + Excel)
   (快照 · 预警)               └───▶ 飞书 Webhook    (交互式卡片)
```

除元数据库外，API 服务本身是无状态的；SPA 通过同源的 `/api` 前缀与之通信（包含位于 `/api/chat` 的 WebSocket）。服务进程内运行两个后台调度器 —— 一个负责指标**快照**，一个负责**预警** —— 两者都以原子方式领取到期任务，因此可安全地多实例运行。预警触发时会投递到该规则上启用的每个渠道（邮件和/或飞书），且每个渠道的结果独立记录，部分失败也能清晰可见。

## ⚡ 使用 Docker 快速开始（推荐）

运行整套环境（数据库 + API + Web UI）最快的方式：

```bash
docker compose up -d --build
```

随后打开 **<http://localhost:9528>** 并创建首个管理员账户。无需 Rust/Node 工具链，也无需手动建库。

**你将得到：**

| 服务 | 角色 |
|---------|------|
| 🗄️ `db` | MySQL 元数据存储（仅内部访问，不对宿主机暴露） |
| 🦀 `server` | Rust API（内部 `:3001`；首次启动时生成并持久化强 `JWT_SECRET`） |
| 🌐 `web` | Nginx 提供 SPA 并代理 `/api`（含聊天 WebSocket），对外发布于 **:9528** |

如需自定义端口、密码或 CORS，请将 `.env.example` 复制为 `.env` 后再运行。迁移脚本会在服务启动时自动执行。

```bash
docker compose logs -f server     # 跟踪 API 日志
docker compose down               # 停止（保留数据卷）
docker compose down -v            # 停止并清除所有数据
```

> 🛡️ **生产环境：** 在 `.env` 中设置强 `MYSQL_*` 密码和真实的 `CORS_ALLOWED_ORIGIN`，并在你自己的反向代理 / 负载均衡器后端做 TLS 终止。

## 💻 本地开发

<details>
<summary><b>前置依赖</b></summary>

- [Rust](https://rustup.rs/)（stable）
- [Node.js](https://nodejs.org/) 18+
- MySQL 或 MariaDB

</details>

**1. 创建元数据库**

```sql
CREATE DATABASE ai_report CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**2. 配置并运行服务端**

```bash
cd server
cp .env.example .env        # 然后编辑 DATABASE_URL 和 JWT_SECRET
cargo run                   # 自动执行迁移；监听 :3001
```

**3. 运行客户端**

```bash
cd client
npm install
npm run dev                 # Vite 开发服务器会把 /api 代理到 Rust 服务
```

打开终端输出的本地地址，创建首个管理员账户，然后在 **设置** 中添加数据源并配置你的大模型服务。

## ⚙️ 配置

服务端配置位于 `server/.env`（参见 `server/.env.example`）：

| 变量 | 说明 |
|----------|-------------|
| `DATABASE_URL` | 元数据库连接串。 |
| `JWT_SECRET` | 签发鉴权 token 的密钥（**至少 16 个字符**）。 |
| `CORS_ALLOWED_ORIGIN` | 允许的来源，开发环境可用 `*`。 |

> 大模型服务、API Key、模型名以及通知设置（SMTP 与飞书 Webhook）均在应用内运行时配置（设置 / 预警），保存在数据库中 —— 无需环境变量。

## 📦 生产环境部署

`scripts/` 下的辅助脚本可自动完成 Linux 部署（systemd + Nginx）：

```bash
# 在服务器上执行一次（安装工具链、数据库、Nginx，构建并配置 TLS）：
bash scripts/setup-server.sh [domain]

# 在你的机器上，每次发布执行：
./scripts/deploy.sh user@host [domain]
```

Rust 二进制在目标主机上构建，以避免 glibc/架构不匹配；SPA 在本地构建并作为静态文件由 Nginx 提供，Nginx 同时把 `/api`（含聊天 WebSocket）反向代理到 API 服务。完整且带注释的流程见脚本本身。

> 💡 偏好容器化？上面的 Docker Compose 方案同样可用于生产环境，部署在你自己的 TLS 终止代理之后即可。

## 🗂️ 项目结构

```
ai-report/
├── client/                 # React + Vite SPA
│   └── src/
│       ├── pages/          # 路由级页面
│       ├── components/     # 通用 UI
│       ├── stores/         # Zustand 状态
│       ├── lib/            # API 客户端与类型
│       └── i18n/           # 中英文翻译
├── server/                 # Rust (axum) API
│   ├── src/
│   │   ├── routes/         # HTTP / WS 处理器
│   │   ├── llm/            # 大模型客户端与提示词
│   │   ├── alert_engine.rs # 预警的评估与多渠道投递
│   │   ├── email.rs        # SMTP 邮件发送（lettre）
│   │   ├── feishu.rs       # 飞书（Lark）Webhook 推送
│   │   └── ...
│   └── migrations/         # SQL 迁移（启动时执行）
├── docs/                   # 设计文档
├── scripts/                # 部署脚本
├── docker-compose.yml      # 一条命令拉起整套环境
└── .env.example            # compose 配置
```

## 🔒 安全

- 🔑 **认证** —— 基于 JWT 的会话；缺少强 `JWT_SECRET` 时服务拒绝启动。登录有限流以防暴力破解。
- 🛡️ **默认只读** —— 用户/AI 的 SQL 都要经过白名单校验（仅允许 `SELECT`/`SHOW`/`DESCRIBE`/`EXPLAIN`/CTE），并带有单次查询超时和行数上限。
- 🙈 **凭据处理** —— 数据源/大模型的凭据，以及通知密钥（SMTP 密码、飞书加签密钥）绝不会被 API 返回。
- 📣 **漏洞上报** —— 请将安全问题私下发送至 **[macrogroot@outlook.com](mailto:macrogroot@outlook.com)**，不要公开提交 issue。

> 请将元数据库视为敏感资产：它存储着连接凭据。请运行在可信主机上并限制网络访问。

## 🗺️ 路线图

- [ ] **基于 embedding 的语义检索**（用于知识库与示例，目前为关键词相关性排序）
- [ ] 飞书**多维表格（Bitable / Base）**同步 —— 将指标/预警记录写入多维表格
- [ ] 更多通知渠道（钉钉、企业微信、Slack）
- [ ] 存储凭据的静态加密（通过密钥可选开启）
- [ ] 将 Oracle 支持改为可选的构建特性 + 更精简的默认镜像
- [ ] 在打 tag 发布时推送多架构 Docker 镜像（GHCR）
- [ ] `SECURITY.md`、`CHANGELOG.md` 与更完善的测试覆盖
- [ ] 更多图表类型与看板模板

## 🤝 参与贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发流程、编码规范和 PR 指南。

## 📬 联系方式

有问题、想法或反馈？欢迎联系：

- 📧 **邮箱** —— [macrogroot@outlook.com](mailto:macrogroot@outlook.com)
- 🐛 **Bug 与需求** —— 提交 [issue](../../issues)

## 📄 许可证

基于 [MIT License](LICENSE) 发布 © 2026 Macro。

<div align="center"><sub>用 🦀 Rust 与 ⚛️ React 构建。</sub></div>
