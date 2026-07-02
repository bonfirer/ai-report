pub mod datasources;
pub mod knowledge_graph;
pub mod conversations;
pub mod chat;
pub mod query;
pub mod reports;
pub mod report_groups;
pub mod report_datasources;
pub mod report_themes;
pub mod metric_groups;
pub mod metric_pools;
pub mod llm_config;
pub mod knowledge_base;
pub mod auth;
pub mod ai_logs;
pub mod ai_examples;
pub mod achievements;
pub mod snapshots;
pub mod alerts;
pub mod table_descriptions;

use axum::http::StatusCode;

/// Map any internal error to a generic HTTP 500, logging the real cause
/// server-side. Use this for unexpected failures (DB/driver/serialization) so
/// internal detail (SQL, schema, connection strings) never leaks to clients.
pub fn internal_error<E: std::fmt::Display>(e: E) -> (StatusCode, String) {
    tracing::error!("internal error: {}", e);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Internal server error".to_string(),
    )
}
