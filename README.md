<div align="center">

# 📊 AI Report Platform

**Connect your databases, talk to your data, and let AI build the dashboards.**

<sub>🤖 AI 驱动的数据分析与报表平台 · 自然语言查询 · 指标库 · 一键生成可交互看板 · 邮件预警</sub>

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

</div>

---

## 💡 Overview

**AI Report Platform** turns a raw database into shareable, interactive dashboards — without writing SQL or wiring up a BI tool. Connect MySQL, PostgreSQL, or Oracle, then:

- **Ask in plain language** and the assistant writes & runs read-only SQL for you.
- **Curate a metrics library** that doubles as a knowledge base, grounding the AI in your business definitions.
- **Generate complete HTML dashboards** with a prompt, refine them conversationally, and keep a full version history.
- **Stay informed** with scheduled snapshots and threshold-based **email alerts** that ship the data as an Excel attachment.

> 🇨🇳 **中文简介**：接入数据库后，用自然语言对话即可自动生成 SQL 查询、沉淀业务指标库、由大模型一键生成可交互的 HTML 数据看板，并支持版本管理、分享、定时快照，以及按指标阈值触发、AI 自动撰写邮件正文、附带 Excel 数据的**邮件预警**。

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
| 🔔 | **Email alerts** | Set threshold rules on metrics; when triggered, an **AI-generated** email goes out on your schedule with the metric data attached as an **Excel** file. |
| 🧠 | **Knowledge base** | Accumulates business knowledge from your conversations to ground future answers. |
| 🌍 | **Internationalization** | English and Chinese UI out of the box. |
| 🔐 | **Authentication** | JWT-based auth with first-run admin setup and login rate-limiting. |

## 🛠️ Tech stack

| Layer | Technology |
|-------|------------|
| 🦀 **Backend** | Rust · [axum](https://github.com/tokio-rs/axum) · [sqlx](https://github.com/launchbadge/sqlx) · [tokio](https://tokio.rs/) |
| 🗄️ **Metadata DB** | MySQL / MariaDB |
| 🎯 **Analyzed sources** | MySQL · PostgreSQL · Oracle |
| 🤖 **LLM** | Any OpenAI-compatible API (DeepSeek, OpenAI, …) |
| 📧 **Email / files** | SMTP via [lettre](https://github.com/lettre/lettre) · Excel via [rust_xlsxwriter](https://github.com/jmcnamara/rust_xlsxwriter) |
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
   Background schedulers ──────────▶ SMTP server
   (snapshots · email alerts)        (alert emails + Excel attachments)
```

The API server is stateless apart from the metadata database; the SPA talks to it through a same-origin `/api` prefix (including a WebSocket at `/api/chat`). Two background schedulers run inside the server process — one for metric **snapshots**, one for **email alerts** — both claiming due work atomically so they're safe to run as multiple instances.

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

> The LLM provider, API key, model, and SMTP settings are configured at runtime in the app (Settings / Email Alerts) and stored in the database — no environment variable needed.

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
│   │   ├── alert_engine.rs # email-alert evaluation & delivery
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
- 🙈 **Secret handling** — datasource/LLM/SMTP credentials are never returned by the API.
- 📣 **Reporting a vulnerability** — please report security issues privately to **[macrogroot@outlook.com](mailto:macrogroot@outlook.com)** rather than opening a public issue.

> Treat the metadata database as sensitive: it stores connection credentials. Run it on a trusted host and restrict network access.

## 🗺️ Roadmap

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
