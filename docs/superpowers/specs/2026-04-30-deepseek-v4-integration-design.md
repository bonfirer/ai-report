# DeepSeek V4 Integration Design

## Overview

Replace the stub chat.rs with full LLM integration using DeepSeek V4. Supports three scenarios: conversations (chat), report generation (AI-selected visualizations), and knowledge graph enhancement. Uses raw reqwest HTTP + SSE instead of AI SDK to avoid reasoning_content passthrough bugs.

## Architecture

```
server/src/
├── llm/
│   ├── mod.rs          # LlmClient struct, public API
│   ├── client.rs       # reqwest SSE streaming + JSON mode
│   └── prompts.rs      # System prompts per scenario
├── routes/
│   ├── chat.rs         # Rewired: WS → LLM stream → SQL exec → data pools
│   └── reports.rs      # Modified render: LLM → ReportRenderConfig
└── main.rs             # Register llm module
```

## Core Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| HTTP library | raw `reqwest` (already a dependency) | AI SDK not available in Rust; reqwest handles SSE natively |
| Stream parsing | Manual SSE line-by-line via `futures::StreamExt` | Full control over reasoning_content extraction |
| JSON output | `response_format: { type: "json_object" }` | Avoids tool-calling which triggers reasoning_content passthrough bugs in V4 |
| Multi-turn | Store `reasoning_content` in conversation message metadata; include in next assistant message | V4 requires reasoning_content echoed back in subsequent turns |
| Sync calls | `tokio::spawn` for report generation (non-streaming) | Report config generation is one-shot, doesn't need streaming |

## LlmClient API

```rust
impl LlmClient {
    /// Streaming chat — returns SSE lines as they arrive
    async fn chat_stream(&self, config: &LLMConfig, messages: Vec<Message>, 
        on_chunk: impl Fn(ChatChunk)) -> Result<FullResponse>;

    /// One-shot JSON generation (report config, KG inference)
    async fn generate_json<T: DeserializeOwned>(&self, config: &LLMConfig, 
        messages: Vec<Message>) -> Result<T>;
}
```

## reasoning_content Flow

```
Turn 1:
  Request:  [{role: "user", content: "Show revenue"}]
  Response: SSE chunks with reasoning_content + content
  Stored:   assistant.reasoning_content = "Let me analyze..."

Turn 2:
  Request:  [{role: "user", content: "..."}, 
             {role: "assistant", content: "...", reasoning_content: "Let me analyze..."},
             {role: "user", content: "Now by region"}]
  Response: (continues with previous reasoning context)
```

## Scenario Details

### A. Conversations (chat.rs)

1. WS receives `{ action: "chat", query, conversation_id }`
2. Load conversation history from DB, inject `reasoning_content` into prior assistant messages
3. Append knowledge graph context to system prompt
4. Call `llm_client.chat_stream()` with tool-like JSON schema in prompt
5. Stream `thinking` events to frontend via WS
6. On `done`: parse JSON response for SQL queries → execute → create DataPool → send `pools_ready`
7. Save assistant message + reasoning_content to DB

### B. Report Generation (reports.rs render)

1. Frontend calls `POST /api/reports/{id}/render` with optional user intent
2. Load report + pool data from DB
3. Call `llm_client.generate_json::<ReportRenderConfig>()` with data context
4. Update report.config with AI-generated visualization layout
5. Return updated report

### C. Knowledge Graph (future enhancement)

- Invoke LLM to infer relationships beyond FK constraints (naming patterns, same-name columns across tables)
- Store inferred edges alongside schema-derived edges

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `server/src/llm/mod.rs` | New — struct definition | ~30 |
| `server/src/llm/client.rs` | New — HTTP + SSE logic | ~120 |
| `server/src/llm/prompts.rs` | New — system prompts | ~80 |
| `server/src/routes/chat.rs` | Rewrite — LLM integration | ~150 |
| `server/src/routes/reports.rs` | Modify render | ~40 |
| `server/src/models.rs` | Add reasoning_content to Message | ~3 |
| `server/src/main.rs` | Register module | ~1 |
| `server/migrations/` | Add reasoning_content column | ~2 |
| `client/src/pages/SettingsPage.tsx` | Add deepseek-v4 model option | ~3 |
| `client/src/i18n/en/translation.json` | Add model label | ~1 |
| `client/src/i18n/zh/translation.json` | Add model label | ~1 |

## Database Change

```sql
ALTER TABLE messages ADD COLUMN reasoning_content TEXT NULL;
```

## Not In Scope

- Streaming report generation (reports are one-shot JSON)
- Model fine-tuning / prompt versioning
- Token usage tracking / billing
- Multi-model routing / fallback chains
