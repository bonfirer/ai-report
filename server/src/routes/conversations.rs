use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

use crate::models::*;
use crate::AppState;

pub async fn list(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Conversation>>, (StatusCode, String)> {
    let convs = sqlx::query_as::<_, Conversation>(
        "SELECT * FROM conversations ORDER BY updated_at DESC",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(convs))
}

pub async fn create(
    State(state): State<Arc<AppState>>,
) -> Result<(StatusCode, Json<Conversation>), (StatusCode, String)> {
    let result = sqlx::query("INSERT INTO conversations (title) VALUES (?)")
        .bind("New Conversation")
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let conv = sqlx::query_as::<_, Conversation>("SELECT * FROM conversations WHERE id = ?")
        .bind(result.last_insert_id() as i32)
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(conv)))
}

pub async fn get_messages(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<Vec<Message>>, (StatusCode, String)> {
    let messages = sqlx::query_as::<_, Message>(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(messages))
}

/// Lightweight status endpoint so the client can poll an in-progress
/// async generation after navigating away and back.
pub async fn get_status(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let row = sqlx::query_as::<_, (Option<String>, Option<String>)>(
        "SELECT generation_status, generation_error FROM conversations WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Conversation not found".to_string()))?;

    Ok(Json(serde_json::json!({
        "generation_status": row.0.unwrap_or_else(|| "idle".into()),
        "generation_error": row.1,
    })))
}

pub async fn delete(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM conversations WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Conversation not found".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}
