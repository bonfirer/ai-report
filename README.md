# AI Report Platform

An AI-powered data analytics and reporting platform. Connect your databases,
explore them through natural-language conversations that turn into SQL, curate
a library of business metrics, and let an LLM generate polished, self-contained
HTML dashboards — with versioning, sharing, scheduled snapshots, and a built-in
knowledge base that learns from your data.

> 中文简介：这是一个 AI 驱动的数据分析与报表平台。接入数据库后，可以用自然语言对话查询（自动生成 SQL）、
> 沉淀业务指标库、由大模型一键生成可交互的 HTML 数据看板，并支持版本管理、分享、定时快照与知识库沉淀。

## Features

- **Data sources** — connect MySQL, PostgreSQL, or Oracle databases; introspect
  schemas and visualize relationships as a knowledge graph.
- **AI conversations** — ask questions in plain language; the assistant writes
  and runs read-only SQL, auto-fixes failed queries, and explains results.
  Generation runs server-side, so it keeps going even if you navigate away.
- **Metrics library** — save validated queries as named business metrics. The
  library doubles as a knowledge base that grounds the AI in your definitions.
- **AI dashboards** — generate complete, responsive HTML dashboards (ECharts)
  from your data, refine them conversationally, and keep a full version history.
- **Sharing & snapshots** — publish reports via unguessable share links and
  schedule metric snapshots for trend comparisons.
- **Internationalization** — English and Chinese UI out of the box.
- **Auth** — JWT-based authentication with first-run admin setup.

## Tech stack

| Layer    | Technology |
|----------|------------|
| Backend  | Rust, [axum](https://github.com/tokio-rs/axum), sqlx, tokio |
| Database | MySQL / MariaDB (platform metadata) |
| Targets  | MySQL, PostgreSQL, Oracle (the data sources you analyze) |
| LLM      | Any OpenAI-compatible API (e.g. DeepSeek, OpenAI) |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, Zustand, React Router |

## Architecture

```
Browser ──HTTPS──> Nginx ──/──────────> Static SPA (client/dist)
                     └────/api/* ──────> Rust API server (axum, :3001)
                                              ├── MySQL/MariaDB (metadata)
                                              ├── Your data sources (MySQL/PG/Oracle)
                                              └── LLM provider (OpenAI-compatible)
```

The API server is stateless apart from the metadata database; the SPA talks to
it through a same-origin `/api` prefix (including a WebSocket at `/api/chat`).

## Quick start (local development)

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) 18+
- MySQL or MariaDB

### 1. Create the metadata database

```sql
CREATE DATABASE ai_report CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configure and run the server

```bash
cd server
cp .env.example .env        # then edit DATABASE_URL and JWT_SECRET
cargo run                   # migrations run automatically on startup; listens on :3001
```

### 3. Run the client

```bash
cd client
npm install
npm run dev                 # Vite dev server proxies /api to the Rust server
```

Open the printed local URL, create the first admin account, then add a data
source and configure your LLM provider in **Settings**.

## Configuration

Server configuration lives in `server/.env` (see `server/.env.example`):

- `DATABASE_URL` — connection string for the metadata database.
- `JWT_SECRET` — secret for signing auth tokens (min. 16 chars).
- `CORS_ALLOWED_ORIGIN` — allowed origin, or `*` for development.

The LLM provider, API key, and model are set at runtime in the Settings page
and stored in the database — no environment variable needed.

## Production deployment

Helper scripts under `scripts/` automate a Linux deployment (systemd + Nginx):

```bash
# One-time, on the server (installs toolchain, DB, Nginx, builds, configures TLS):
bash scripts/setup-server.sh [domain]

# From your machine, for each release:
./scripts/deploy.sh user@host [domain]
```

The Rust binary is built on the target host to avoid glibc/architecture
mismatches; the SPA is built locally and served as static files by Nginx, which
also reverse-proxies `/api` (including the chat WebSocket) to the API server.
See the scripts for the full, commented workflow.

## Project structure

```
ai-report/
├── client/          # React + Vite SPA
│   ├── src/
│   │   ├── pages/        # route-level pages
│   │   ├── components/   # shared UI
│   │   ├── stores/       # Zustand state
│   │   ├── lib/          # API client & types
│   │   └── i18n/         # en / zh translations
├── server/          # Rust (axum) API
│   ├── src/
│   │   ├── routes/       # HTTP/WS handlers
│   │   ├── llm/          # LLM client & prompts
│   │   └── ...
│   └── migrations/       # SQL migrations (run on startup)
├── docs/            # design notes
└── scripts/         # deployment scripts
```

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2026 Macro
