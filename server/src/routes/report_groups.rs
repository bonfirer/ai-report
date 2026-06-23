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
) -> Result<Json<Vec<ReportGroup>>, (StatusCode, String)> {
    let groups = sqlx::query_as::<_, ReportGroup>(
        "SELECT * FROM report_groups ORDER BY sort_order ASC, created_at ASC",
    )
    .fetch_all(&state.db)
    .await
    .map_err(crate::routes::internal_error)?;

    Ok(Json(groups))
}

pub async fn create(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateReportGroup>,
) -> Result<(StatusCode, Json<ReportGroup>), (StatusCode, String)> {
    let result = sqlx::query(
        "INSERT INTO report_groups (name, description) VALUES (?, ?)",
    )
    .bind(&payload.name)
    .bind(&payload.description)
    .execute(&state.db)
    .await
    .map_err(crate::routes::internal_error)?;

    let group = sqlx::query_as::<_, ReportGroup>("SELECT * FROM report_groups WHERE id = ?")
        .bind(result.last_insert_id() as i32)
        .fetch_one(&state.db)
        .await
        .map_err(crate::routes::internal_error)?;

    Ok((StatusCode::CREATED, Json(group)))
}

pub async fn update(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateReportGroup>,
) -> Result<Json<ReportGroup>, (StatusCode, String)> {
    let existing = sqlx::query_as::<_, ReportGroup>("SELECT * FROM report_groups WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(crate::routes::internal_error)?
        .ok_or((StatusCode::NOT_FOUND, "Group not found".to_string()))?;

    sqlx::query("UPDATE report_groups SET name=?, description=?, sort_order=? WHERE id=?")
        .bind(payload.name.as_deref().unwrap_or(&existing.name))
        .bind(payload.description.as_deref().or(existing.description.as_deref()))
        .bind(payload.sort_order.unwrap_or(existing.sort_order))
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(crate::routes::internal_error)?;

    let group = sqlx::query_as::<_, ReportGroup>("SELECT * FROM report_groups WHERE id = ?")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(crate::routes::internal_error)?;

    Ok(Json(group))
}

pub async fn remove(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<StatusCode, (StatusCode, String)> {
    // Move reports in this group to ungrouped
    sqlx::query("UPDATE reports SET group_id = NULL WHERE group_id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(crate::routes::internal_error)?;

    let result = sqlx::query("DELETE FROM report_groups WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(crate::routes::internal_error)?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Group not found".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}

/// Move a report to a group (or ungrouped with group_id=null).
pub async fn move_report(
    State(state): State<Arc<AppState>>,
    Path(report_id): Path<i32>,
    Json(payload): Json<MoveToGroup>,
) -> Result<Json<Report>, (StatusCode, String)> {
    let result = sqlx::query("UPDATE reports SET group_id = ? WHERE id = ?")
        .bind(payload.group_id)
        .bind(report_id)
        .execute(&state.db)
        .await
        .map_err(crate::routes::internal_error)?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Report not found".to_string()));
    }

    let report = sqlx::query_as::<_, Report>("SELECT * FROM reports WHERE id = ?")
        .bind(report_id)
        .fetch_one(&state.db)
        .await
        .map_err(crate::routes::internal_error)?;

    Ok(Json(report))
}
