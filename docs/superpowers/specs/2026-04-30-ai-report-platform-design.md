# AI Report Platform — Design Specification

**Date:** 2026-04-30
**Status:** Approved
**Tech Stack:** React (frontend) + Rust/Axum (backend) + MySQL (metadata + user data sources)

---

## 1. Product Positioning

An enterprise-grade AI-powered reporting platform. Users configure data sources (MySQL databases), the platform auto-introspects schemas and generates a knowledge graph, then users interact via natural language conversation. The AI generates SQL queries as "data pools", users select multiple pools, and the AI intelligently chooses optimal visualization types to render complex reports.

**Target Audience:** Mixed — Business executives (simplified view, natural language Q&A) and data analysts (schema exploration, SQL visibility, multi-source data stitching). Role-based views adapt the interface.

**Design Benchmark:** Databricks AI/BI — GenAI-driven dashboards with a dark, technically refined aesthetic.

---

## 2. Visual Design

### 2.1 Color Palette — "Obsidian"

| Token | Hex | Usage |
|-------|-----|-------|
| Background Primary | `#08080c` | Main page background |
| Background Card | `#12121a` | Cards, panels, elevated surfaces |
| Background Input | `#0d0d14` | Input fields, subtle depth |
| Border Default | `#1f1f28` | Standard dividers and borders |
| Accent Primary | `#d4a853` | Amber gold — CTAs, active states, highlights |
| Data Positive | `#4ade80` | Revenue, growth, success indicators |
| Data Warning | `#f59e0b` | Cautions, secondary metrics |
| Text Primary | `#e5e7eb` | Primary text |
| Text Secondary | `#9ca3af` | Labels, descriptions |
| Code/Monospace | `#4ade80` on `#08080c` | SQL blocks, data values |

### 2.2 Typography

- **Display/Headings:** Geist or Satoshi, `tracking-tighter`
- **Body:** System sans-serif, `text-base`, `leading-relaxed`
- **Monospace:** JetBrains Mono or Geist Mono — all SQL code, numbers in KPI cards, data pool names
- **Serif fonts are banned** — this is a dashboard/software UI

### 2.3 Design System Principles

- **No pure black** (`#000000`) — use `#08080c` off-black
- **No neon glows, no purple/blue AI aesthetic** — banned
- **Single accent color** (amber gold `#d4a853`), saturation < 80%
- **Cards used sparingly** — only when elevation communicates hierarchy; otherwise use `border-t`, `divide-y`, or negative space
- **Shadows tinted to background hue** — no generic `box-shadow`

---

## 3. Layout Architecture

### 3.1 Four-Panel Structure

```
┌──────┬────────────┬───────────────┬──────────┐
│ Nav  │   Asset    │  Main Canvas  │ AI Panel │
│ 52px │   190px    │    flex:1     │  240px   │
│      │            │               │          │
│  DS  │ Data       │ KPI Cards     │ Genie AI │
│  KG  │ Sources    │ Charts        │ Chat     │
│  AI  │ Knowledge  │ Tables        │ Data     │
│  RP  │ Graph      │ Reports       │ Pools    │
│      │ Summary    │               │          │
│  ST  │            │               │          │
│  👤  │            │               │          │
└──────┴────────────┴───────────────┴──────────┘
```

- **Nav (52px):** Icon-based vertical navigation. Items: DS (Data Sources), KG (Knowledge Graph), AI (Conversations), RP (Reports), ST (Settings). User avatar at bottom. Active item has left border + amber highlight.
- **Asset Panel (190px):** Context-sensitive sidebar — shows data source list on DS view, knowledge graph summary on KG view, recent reports on RP view. Collapsible to icon mode below 1440px.
- **Main Canvas (flex:1):** Primary work area. Renders the current view — schema explorer, full knowledge graph, conversation thread, or report dashboard.
- **AI Panel (240px):** Always-visible contextual AI assistant. Quick questions while viewing reports. Shows generated SQL data pools with checkboxes.

### 3.2 Responsive Behavior

| Viewport | Behavior |
|----------|----------|
| ≥ 1440px | Full 4-panel layout |
| 1024–1439px | Asset Panel collapses to icon mode (40px). AI Panel shrinks to 200px |
| < 1024px | Single column. Nav becomes bottom tab bar. AI Panel becomes a slide-over drawer |

### 3.3 Dual AI Interaction Model

| Mode | Location | Purpose |
|------|----------|---------|
| **Contextual** | Right 240px panel (always visible) | Quick questions: "Why did this metric drop?" Context-aware from current report |
| **Deep Dive** | Conversations page (main canvas) | Full conversation thread. Multi-turn analysis. Generate multiple data pools, iterate, compose reports. Data pool cards inline in chat flow |

---

## 4. Screen Inventory & User Flows

### 4.1 Data Sources (DS)

**Purpose:** Configure connections to user MySQL databases. Auto-introspect schemas.

**Key Interactions:**
- Add/Edit/Delete data source connections (host, port, database, credentials)
- Test connection with status indicator (green/yellow/red dot)
- Trigger schema introspection — fetches all tables, columns, types, foreign keys
- Display introspected schema: table list with column counts, detected relationships
- Per-table: column details (name, type, nullable, key status)

**Empty State:** "No data sources configured. Connect your first MySQL database to begin." with prominent CTA.

**Loading State:** Skeleton table rows during introspection.

**Error State:** Inline error banner for connection failures with retry button.

### 4.2 Knowledge Graph (KG)

**Purpose:** AI-generated entity relationship model showing tables as nodes and foreign keys as edges. Searchable, interactive.

**Key Interactions:**
- Interactive graph visualization (nodes = tables, edges = relationships)
- Click node → expand column details in side panel
- Search/filter entities by name
- Graph is generated once on schema introspection, stored as JSON, refreshed on-demand
- AI uses the knowledge graph as context for generating SQL queries

**Data Model:** Stored as JSON in metadata database:
```json
{
  "nodes": [{"id": "orders", "label": "orders", "columns": [...]}],
  "edges": [{"source": "orders", "target": "customers", "type": "FK", "on": "customer_id"}]
}
```

### 4.3 Conversations (AI)

**Purpose:** Deep-dive AI analysis sessions. Multi-turn conversation with SQL data pool generation.

**Key Interactions:**
- Natural language input → AI streams response (thinking + SQL + explanation)
- AI returns SQL queries as "Data Pool" cards inline in the conversation
- Each data pool card shows: SQL preview, row count, column list, source
- User checks/unchecks data pools to include in report composition
- "Render Report" action takes selected pools + user's visualization intent → generates report
- Conversation history preserved per session

**Loading State:** Streaming text with amber blinking cursor during AI generation.

**Empty State:** "Ask a question about your data to get started." with example prompts.

### 4.4 Reports (RP)

**Purpose:** View rendered reports. Gallery of saved reports. AI auto-selects visualization types.

**Key Interactions:**
- Report header: title, data pool count, last updated timestamp
- Export (PDF, CSV, PNG), Share, Edit actions
- AI-selected visualizations: KPI cards, bar charts, line charts, heatmaps, tables
- User can request AI to re-render with different visualization type
- Report gallery: grid of saved report cards with thumbnails

**Visualization Types AI Can Select From:**
- KPI cards (single metric with delta)
- Bar chart (comparison across categories)
- Line chart (time series trends)
- Stacked area (composition over time)
- Heatmap (2D distribution)
- Table (detailed breakdown)
- Funnel (stage conversion)
- Pie/Donut (proportional composition — only for < 6 categories)

### 4.5 Settings (ST)

**Purpose:** Platform configuration — LLM provider, API keys, model selection, user preferences.

**Key Interactions:**
- LLM provider configuration (OpenAI-compatible API: base URL, API key, model name)
- Test connection to verify LLM is reachable
- User profile and role management (future)

---

## 5. Backend Architecture

### 5.1 Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| HTTP Framework | Axum | tokio-native, type-safe, performant |
| Database Driver | sqlx | Compile-time SQL verification, multi-pool support |
| WebSocket | Axum built-in + tokio | Native support, no extra deps |
| LLM Integration | reqwest + SSE parsing | Direct HTTP to OpenAI-compatible API (Rust AI SDKs immature) |
| Serialization | serde + serde_json | Standard Rust serialization |
| User DB Access | sqlx dynamic connections | Per-datasource connection pools for user MySQL databases |

### 5.2 Dual MySQL Role

| Database | Purpose | Connection |
|----------|---------|------------|
| **Metadata DB** | `datasources`, `reports`, `conversations`, `knowledge_graphs`, `users`, `llm_config` tables | Fixed connection pool at startup |
| **User Data Sources** | User's own business databases (sales_prod, analytics, etc.) | Dynamic pools created per datasource on-demand |

### 5.3 API Routes

```
# Data Sources
POST   /api/datasources                 Create connection
GET    /api/datasources                 List all
GET    /api/datasources/:id             Get details
PUT    /api/datasources/:id             Update connection
DELETE /api/datasources/:id             Remove
POST   /api/datasources/:id/test        Test connectivity
POST   /api/datasources/:id/introspect  Trigger schema introspection
GET    /api/datasources/:id/schema      Get introspected schema

# Knowledge Graph
GET    /api/knowledge-graph/:ds_id           Get graph (generated from introspection)
POST   /api/knowledge-graph/:ds_id/refresh   Regenerate

# Conversations
GET    /api/conversations               List conversations
POST   /api/conversations               Create new
GET    /api/conversations/:id           Get messages
DELETE /api/conversations/:id           Delete
WS     /api/chat                        WebSocket streaming chat

# Query Execution (Data Pools)
POST   /api/query/execute              Execute SQL (with safety validation)
GET    /api/query/:pool_id             Get cached result (paginated)

# Reports
POST   /api/reports                    Create report (submit pool IDs + description)
GET    /api/reports                    List reports
GET    /api/reports/:id                Get report definition + data
PUT    /api/reports/:id                Update (re-render request)
DELETE /api/reports/:id                Delete

# LLM Configuration
GET    /api/llm/config                 Get current LLM settings
PUT    /api/llm/config                 Update LLM settings
POST   /api/llm/config/test            Test LLM connection
```

### 5.4 AI Chat Data Flow

```
1. User sends natural language query via WebSocket
2. Backend retrieves conversation history + knowledge graph for context
3. Backend constructs system prompt with:
   - Schema information (tables, columns, relationships)
   - Rules: SELECT-only, no DDL/DML, safety constraints
4. Backend calls LLM (reqwest + SSE streaming)
5. LLM response streams back through WebSocket:
   - "thinking" events: AI reasoning process
   - "sql" events: generated SQL query → displayed as Data Pool card
   - "explanation" events: natural language explanation
   - "done" event: conversation turn complete
6. User selects data pools and submits "render" request
7. Backend executes selected SQL queries (read-only validation first)
8. Query results + user visualization intent sent to LLM
9. LLM returns JSON: { visualizations: [...], layout: "..." }
10. Frontend renders report using ECharts
```

### 5.5 SQL Safety

All user-facing SQL execution goes through a safety validator:
- **Allow:** SELECT statements only
- **Deny:** INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE
- **Deny:** Multiple statements (semicolon injection)
- **Deny:** Certain functions (LOAD_FILE, INTO OUTFILE, etc.)
- **Timeout:** 30-second query timeout
- **Row limit:** Default 50,000 rows cap

### 5.6 Metadata Database Schema

```sql
CREATE TABLE datasources (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,  -- or SERIAL for MySQL
    name        VARCHAR(255) NOT NULL,
    db_type     VARCHAR(50) NOT NULL DEFAULT 'mysql',
    host        VARCHAR(255) NOT NULL,
    port        INTEGER NOT NULL DEFAULT 3306,
    database    VARCHAR(255) NOT NULL,
    username    VARCHAR(255) NOT NULL,
    password    TEXT NOT NULL,  -- encrypted at rest
    status      VARCHAR(20) DEFAULT 'unknown',  -- connected, error, unknown
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE knowledge_graphs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    datasource_id   INTEGER NOT NULL REFERENCES datasources(id) ON DELETE CASCADE,
    graph_data      JSON NOT NULL,
    generated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,  -- user, assistant, system
    content         TEXT NOT NULL,
    metadata        JSON,  -- sql queries, data pool refs, etc.
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE data_pools (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER REFERENCES conversations(id),
    name            VARCHAR(255),
    sql_query       TEXT NOT NULL,
    datasource_id   INTEGER NOT NULL REFERENCES datasources(id),
    result_cache    JSON,  -- cached query results
    row_count       INTEGER,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       VARCHAR(500) NOT NULL,
    description TEXT,
    pool_ids    JSON NOT NULL,  -- array of data_pool IDs
    config      JSON NOT NULL,  -- visualization config (chart types, layout)
    data_cache  JSON,           -- cached rendered data
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE llm_config (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,  -- single row
    provider    VARCHAR(50) NOT NULL DEFAULT 'openai',
    base_url    VARCHAR(500) NOT NULL,
    api_key     TEXT NOT NULL,
    model       VARCHAR(100) NOT NULL,
    max_tokens  INTEGER DEFAULT 4096,
    temperature REAL DEFAULT 0.1,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Note: For MySQL metadata, replace `AUTOINCREMENT` with `AUTO_INCREMENT` and `JSON` type is natively supported in MySQL 5.7+.

---

## 6. Frontend Architecture

### 6.1 Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18+ with Vite |
| Styling | Tailwind CSS v3 |
| State Management | Zustand (global stores: datasources, conversations, reports, llm-config) |
| Charts | ECharts (via echarts-for-react) |
| Icons | @phosphor-icons/react |
| Graph Visualization | D3.js (for knowledge graph) |
| WebSocket | Native WebSocket API with custom hook |
| Routing | React Router v6 |

### 6.2 Component Tree (Simplified)

```
<App>
  <LLMConfigProvider>      # Checks LLM is configured, shows setup if not
    <Layout>
      <NavSidebar />        # 52px left nav
      <AssetPanel />        # 190px context panel
      <MainCanvas>          # flex:1
        <Routes>
          <DataSourcesPage />
          <KnowledgeGraphPage />
          <ConversationsPage />
          <ReportsPage />
          <SettingsPage />
        </Routes>
      </MainCanvas>
      <AIPanel />           # 240px right panel (hidden on Conversations page)
    </Layout>
  </LLMConfigProvider>
</App>
```

### 6.3 Zustand Stores

```typescript
// datasourceStore — connections, schemas, introspection status
// conversationStore — active conversation, messages, streaming state
// dataPoolStore — generated pools, selection state
// reportStore — saved reports, current report rendering
// llmConfigStore — provider settings, connection test status
// uiStore — sidebar collapsed, active nav, AI panel visibility
```

### 6.4 Client Component Isolation

All interactive/perpetual-animation components must be isolated leaf Client Components with `'use client'`:
- Knowledge graph visualization (D3.js)
- AI chat streaming (WebSocket)
- Report charts (ECharts)
- Animated status indicators
- Magnetic/spring-animated buttons

---

## 7. Key Design Decisions (Recorded)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout | 4-panel (Nav + Asset + Canvas + AI) | Databricks-inspired. Physical separation of concerns. Role-adaptable |
| Theme | Obsidian (off-black + amber gold) | Premium enterprise feel. Bloomberg-terminal adjacent. Distinct from "AI purple" |
| Nav position | Left sidebar (52px icons) | Vertical space for future expansion. Industry standard (VS Code, Databricks, Figma) |
| AI interaction | Dual-mode (contextual panel + full conversations page) | Serves both executive quick-query and analyst deep-dive workflows |
| Knowledge Graph storage | JSON in metadata DB | KG is AI context, not user traversal. No graph DB needed |
| LLM integration | Direct HTTP + SSE (no Rust SDK) | Rust AI SDKs immature. reqwest + SSE parsing is reliable and controllable |
| Chat protocol | WebSocket | Full-duplex streaming for real-time AI response display |
| SQL safety | Allowlist-based validator | SELECT-only. Multi-statement blocking. Function blacklist. Row/time limits |
| LLM output format | generateObject-style JSON (chart types, layout, config) | Structured output for reliable report rendering. Proven approach from prior iterations |

---

## 8. What's Out of Scope (v1)

- Multi-tenancy / organization management
- OAuth / SSO authentication
- Scheduled/automated report delivery (email, Slack)
- Drag-and-drop dashboard builder (manual layout editing)
- Data source types beyond MySQL (PostgreSQL, BigQuery, etc.)
- Real-time data streaming / live dashboards
- Collaborative/commenting features
- Custom visualization plugins

---

## 9. Success Criteria

1. User can connect a MySQL data source and successfully introspect its schema
2. AI generates an accurate knowledge graph from the introspected schema
3. User can ask natural language questions and receive valid SQL data pools
4. User can select multiple data pools and generate a rendered report
5. AI selects appropriate visualization types based on data characteristics and user intent
6. The platform renders visibly correct charts (KPI, bar, line, heatmap, table)
7. Reports can be exported and re-opened
8. LLM provider configuration works entirely from the frontend Settings page
