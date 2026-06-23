<div align="center">

# LingxiBI

**Connect your databases, talk to your data, and let AI build the dashboards.**

<sub>🤖 AI 驱动的数据分析与报表平台 · 自然语言查询 · 指标库 · 一键生成可交互看板 · 多渠道预警（邮件 / 飞书）</sub>

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-stable-orange?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](#-quick-start-with-docker-recommended)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![i18n](https://img.shields.io/badge/i18n-EN%20%2F%20中文-9cf)](#-features)

[🚀 Live Demo](#-live-demo) ·
[⚡ Quick Start](#-quick-start-with-docker-recommended) ·
[✨ Features](#-features) ·
[🏗️ Architecture](#️-architecture) ·
[📦 Deploy](#-production-deployment)

<br/>

**English** · [简体中文](README.zh-CN.md)

</div>

---

## 💡 Overview

**LingxiBI** (灵犀 — "intuitive understanding") turns a raw database into shareable, interactive dashboards — without writing SQL or wiring up a BI tool. Connect MySQL, PostgreSQL, or Oracle, then:

- **Ask in plain language** and the assistant writes & runs read-only SQL for you.
- **Curate a metrics library** that doubles as a knowledge base, grounding the AI in your business definitions.
- **Get smarter over time** — every conversation teaches the assistant your schema's business rules, and the most relevant lessons are recalled on future questions.
- **Generate complete HTML dashboards** with a prompt, refine them conversationally, and keep a full version history.
- **Stay informed** with scheduled snapshots and threshold-based **alerts** — delivered to email (with the data attached as Excel) and/or pushed to **Feishu (Lark)** as an interactive card.

## 🚀 Live demo

Try it without installing anything:

<table>
  <tr><td>🌐 <b>URL</b></td><td><a href="https://www.termiio.com:9528">https://www.termiio.com:9528</a></td></tr>
  <tr><td>👤 <b>Username</b></td><td><code>admin</code></td></tr>
  <tr><td>🔑 <b>Password</b></td><td><code>admin123</code></td></tr>
</table>

> ⚠️ Shared public demo — please don't enter real credentials or sensitive data, and note that data may be reset periodically. If the site uses a self-signed certificate, your browser may show a security warning you'll need to accept.

## ✨ Features

| | Capability | What it does |
|---|---|---|
| 🔌 | **Data sources** | Connect MySQL, PostgreSQL, or Oracle; introspect schemas and visualize table relationships as a knowledge graph. |
| 💬 | **AI conversations** | Ask questions in natural language; the assistant writes and runs **read-only** SQL, auto-fixes failed queries, and explains results. Generation runs server-side, so it continues even if you navigate away. |
| ⭐ | **Metrics library** | Save validated queries as named business metrics. The library doubles as a knowledge base that keeps the AI consistent with your definitions. |
| 📊 | **AI dashboards** | Generate complete, responsive HTML dashboards (ECharts) from your data, refine them conversationally, and keep a full **version history** with rollback. |
| 🔗 | **Sharing** | Publish reports via unguessable share links, with public/private control. |
| 📸 | **Snapshots** | Schedule periodic metric snapshots for trend, YoY, and MoM comparisons. |
| 🔔 | **Alerts** | Set threshold rules on metrics; when triggered, an **AI-generated** email goes out on your schedule with the metric data attached as an **Excel** file. |
| 🪶 | **Feishu / Lark** | Push the same alerts to a Feishu group as an interactive message **card** via a custom-bot webhook (with optional **HMAC-SHA256** signing). Each rule can use email, Feishu, or both. |
| 🧠 | **Self-learning knowledge** | After every conversation it distills **new** business knowledge (field meanings, table relationships, query patterns, rules) into a per-datasource knowledge base; 👍'd answers become few-shot examples. All of it is **ranked by relevance** and fed back into future SQL generation — so it sharpens the more you use it. |
| 🌍 | **Internationalization** | English and Chinese UI out of the box. |
| 🔐 | **Authentication** | JWT-based auth with first-run admin setup and login rate-limiting. |

## 🧠 How it learns

Most text-to-SQL tools forget everything between questions. LingxiBI instead **accumulates business knowledge about your specific database** and feeds it back into every answer — so it gets sharper the more your team uses it. This compounding, per-datasource memory is what sets the platform apart from a raw "ask-a-model" wrapper.

```
  You ─ ask / 👍 like ─▶  Conversation
                              │  background: extract NEW business knowledge
                              ▼
  Learned context (per data source)
    • Knowledge base — field meanings · relations · rules · query patterns
    • 👍 Few-shot examples
    • Curated metrics library
                              │  relevance-ranked + token-budgeted
                              ▼
  Grounded SQL generation ─▶  better answers, the more you use it
```

- **Automatic extraction** — after each turn, a background task asks the LLM to distill only *new* knowledge, de-duplicated against what's already known, and stores it per data source (with a confidence level).
- **Human-in-the-loop** — 👍 a good answer to save it as a few-shot example the model follows next time.
- **Curated metrics** — validated, named metrics act as high-trust, reusable definitions.
- **Relevance-ranked recall** — on each new question, the most relevant knowledge, examples, and metrics are selected (weighted by confidence and clamped to a token budget) and injected into the prompt, keeping answers grounded without bloating context.

## 🛠️ Tech stack

| Layer | Technology |
|-------|------------|
| 🦀 **Backend** | Rust · [axum](https://github.com/tokio-rs/axum) · [sqlx](https://github.com/launchbadge/sqlx) · [tokio](https://tokio.rs/) |
| 🗄️ **Metadata DB** | MySQL / MariaDB |
| 🎯 **Analyzed sources** | MySQL · PostgreSQL · Oracle |
| 🤖 **LLM** | Any OpenAI-compatible API (DeepSeek, OpenAI, …) |
| 📧 **Email / files** | SMTP via [lettre](https://github.com/lettre/lettre) · Excel via [rust_xlsxwriter](https://github.com/jmcnamara/rust_xlsxwriter) |
| 💬 **Notifications** | Feishu (Lark) custom-bot webhook with optional HMAC-SHA256 signing |
| ⚛️ **Frontend** | React 19 · Vite · TypeScript · Tailwind CSS · Zustand · React Router |

## 🏗️ Architecture

```
                    ┌──────────────────────────────────────────────┐
   Browser ─HTTPS─▶ │  Nginx                                        │
                    │   ├─ /        →  Static SPA (client/dist)      │
                    │   └─ /api/*   →  Rust API server (axum :3001)  │
                    └───────────────────────┬──────────────────────┘
                                             │
            ┌────────────────────────────────┼────────────────────────────────┐
            ▼                                ▼                                 ▼
   MySQL / MariaDB                  Your data sources                  LLM provider
   (platform metadata)             (MySQL · PG · Oracle)            (OpenAI-compatible)
            ▲                                                                  
            │                                                                  
   Background schedulers ──────┬───▶ SMTP server      (alert emails + Excel)
   (snapshots · alerts)        └───▶ Feishu webhook    (interactive cards)
```

The API server is stateless apart from the metadata database; the SPA talks to it through a same-origin `/api` prefix (including a WebSocket at `/api/chat`). Two background schedulers run inside the server process — one for metric **snapshots**, one for **alerts** — both claiming due work atomically so they're safe to run as multiple instances. A triggered alert is delivered to every channel enabled on its rule (email and/or Feishu), and each channel's outcome is recorded independently so a partial failure stays visible.

## ⚡ Quick start with Docker (recommended)

The fastest way to run the whole stack (database + API + web UI):

```bash
docker compose up -d --build
```

Then open **<http://localhost:9528>** and create the first admin account. No Rust/Node toolchain or manual database setup required.

**What you get:**

| Service | Role |
|---------|------|
| 🗄️ `db` | MySQL metadata store (kept internal, not exposed to the host) |
| 🦀 `server` | Rust API (internal `:3001`; a strong `JWT_SECRET` is generated & persisted on first run) |
| 🌐 `web` | Nginx serving the SPA + proxying `/api` (incl. chat WebSocket), published on **:9528** |

To customize ports, passwords, or CORS, copy `.env.example` → `.env` and edit before running. Migrations run automatically on server startup.

```bash
docker compose logs -f server     # follow API logs
docker compose down               # stop (keeps data volumes)
docker compose down -v            # stop and wipe all data
```

> 🛡️ **Production:** set strong `MYSQL_*` passwords and a real `CORS_ALLOWED_ORIGIN` in `.env`, and terminate TLS behind your own reverse proxy / load balancer.

## 💻 Local development

<details>
<summary><b>Prerequisites</b></summary>

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) 18+
- MySQL or MariaDB

</details>

**1. Create the metadata database**

```sql
CREATE DATABASE ai_report CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**2. Configure and run the server**

```bash
cd server
cp .env.example .env        # then edit DATABASE_URL and JWT_SECRET
cargo run                   # migrations run automatically; listens on :3001
```

**3. Run the client**

```bash
cd client
npm install
npm run dev                 # Vite dev server proxies /api to the Rust server
```

Open the printed local URL, create the first admin account, then add a data source and configure your LLM provider in **Settings**.

## ⚙️ Configuration

Server configuration lives in `server/.env` (see `server/.env.example`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Connection string for the metadata database. |
| `JWT_SECRET` | Secret for signing auth tokens (**min. 16 chars**). |
| `CORS_ALLOWED_ORIGIN` | Allowed origin, or `*` for development. |

> The LLM provider, API key, model, and notification settings (SMTP and Feishu webhook) are configured at runtime in the app (Settings / Alerts) and stored in the database — no environment variable needed.

## 📦 Production deployment

Helper scripts under `scripts/` automate a Linux deployment (systemd + Nginx):

```bash
# One-time, on the server (installs toolchain, DB, Nginx, builds, configures TLS):
bash scripts/setup-server.sh [domain]

# From your machine, for each release:
./scripts/deploy.sh user@host [domain]
```

The Rust binary is built on the target host to avoid glibc/architecture mismatches; the SPA is built locally and served as static files by Nginx, which also reverse-proxies `/api` (including the chat WebSocket) to the API server. See the scripts for the full, commented workflow.

> 💡 Prefer containers? The Docker Compose setup above also works in production behind your own TLS-terminating proxy.

## 🗂️ Project structure

```
ai-report/
├── client/                 # React + Vite SPA
│   └── src/
│       ├── pages/          # route-level pages
│       ├── components/     # shared UI
│       ├── stores/         # Zustand state
│       ├── lib/            # API client & types
│       └── i18n/           # en / zh translations
├── server/                 # Rust (axum) API
│   ├── src/
│   │   ├── routes/         # HTTP / WS handlers
│   │   ├── llm/            # LLM client & prompts
│   │   ├── alert_engine.rs # alert evaluation & multi-channel delivery
│   │   ├── email.rs        # SMTP delivery (lettre)
│   │   ├── feishu.rs       # Feishu (Lark) webhook delivery
│   │   └── ...
│   └── migrations/         # SQL migrations (run on startup)
├── docs/                   # design notes
├── scripts/                # deployment scripts
├── docker-compose.yml      # one-command stack
└── .env.example            # compose configuration
```

## 🔒 Security

- 🔑 **Auth** — JWT-signed sessions; the server refuses to start without a strong `JWT_SECRET`. Login is rate-limited against brute force.
- 🛡️ **Read-only by design** — user/AI SQL passes an allowlist validator (only `SELECT`/`SHOW`/`DESCRIBE`/`EXPLAIN`/CTEs) and runs with per-query timeouts and row caps.
- 🙈 **Secret handling** — datasource/LLM credentials and notification secrets (SMTP password, Feishu signing secret) are never returned by the API.
- 📣 **Reporting a vulnerability** — please report security issues privately to **[macrogroot@outlook.com](mailto:macrogroot@outlook.com)** rather than opening a public issue.

> Treat the metadata database as sensitive: it stores connection credentials. Run it on a trusted host and restrict network access.

## 🗺️ Roadmap

- [ ] **Embedding-based semantic retrieval** for the knowledge base & examples (today they're ranked by keyword relevance)
- [ ] Feishu **Bitable (Base)** sync — write metric/alert records into a multi-dimensional table
- [ ] More notification channels (DingTalk, WeChat Work, Slack)
- [ ] Encryption-at-rest for stored credentials (opt-in via key)
- [ ] Optional Oracle support as a build feature + slimmer default image
- [ ] Published multi-arch Docker images (GHCR) on tagged releases
- [ ] `SECURITY.md`, `CHANGELOG.md`, and expanded test coverage
- [ ] More chart types & dashboard templates

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, coding conventions, and PR guidelines.

## 📬 Contact

Questions, ideas, or feedback? Reach out:

- 📧 **Email** — [macrogroot@outlook.com](mailto:macrogroot@outlook.com)
- 🐛 **Bugs & features** — open an [issue](../../issues)

## 📄 License

Released under the [MIT License](LICENSE) © 2026 Macro.

<div align="center"><sub>Built with 🦀 Rust and ⚛️ React.</sub></div>
