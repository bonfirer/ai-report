use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

use crate::models::*;
use crate::routes::query;
use crate::AppState;

pub async fn list(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<MetricPool>>, (StatusCode, String)> {
    let metrics = sqlx::query_as::<_, MetricPool>(
        "SELECT * FROM metric_pools ORDER BY group_id ASC, created_at DESC",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(metrics))
}

pub async fn get_one(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<MetricPool>, (StatusCode, String)> {
    let metric = sqlx::query_as::<_, MetricPool>("SELECT * FROM metric_pools WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Metric not found".to_string()))?;

    Ok(Json(metric))
}

pub async fn create(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateMetricPool>,
) -> Result<(StatusCode, Json<MetricPool>), (StatusCode, String)> {
    // Optionally copy result_cache from source data pool
    let (result_cache, row_count): (Option<serde_json::Value>, Option<i32>) =
        if let Some(source_id) = payload.source_pool_id {
            let pool = sqlx::query_as::<_, DataPool>("SELECT * FROM data_pools WHERE id = ?")
                .bind(source_id)
                .fetch_optional(&state.db)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            match pool {
                Some(p) => (p.result_cache, p.row_count),
                None => (None, None),
            }
        } else {
            (None, None)
        };

    let result = sqlx::query(
        "INSERT INTO metric_pools (name, description, sql_query, datasource_id, group_id, result_cache, row_count, source_pool_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.sql_query)
    .bind(payload.datasource_id)
    .bind(payload.group_id)
    .bind(&result_cache)
    .bind(row_count)
    .bind(payload.source_pool_id)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let metric = sqlx::query_as::<_, MetricPool>("SELECT * FROM metric_pools WHERE id = ?")
        .bind(result.last_insert_id() as i32)
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(metric)))
}

pub async fn update(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateMetricPool>,
) -> Result<Json<MetricPool>, (StatusCode, String)> {
    let existing = sqlx::query_as::<_, MetricPool>("SELECT * FROM metric_pools WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Metric not found".to_string()))?;

    sqlx::query("UPDATE metric_pools SET name=?, description=?, sql_query=?, group_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(payload.name.as_deref().unwrap_or(&existing.name))
        .bind(payload.description.as_deref().or(existing.description.as_deref()))
        .bind(payload.sql_query.as_deref().unwrap_or(&existing.sql_query))
        .bind(payload.group_id.or(existing.group_id))
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let metric = sqlx::query_as::<_, MetricPool>("SELECT * FROM metric_pools WHERE id = ?")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(metric))
}

pub async fn remove(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM metric_pools WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Metric not found".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}

/// Re-execute the metric's SQL and refresh its cached data.
pub async fn refresh(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<MetricPool>, (StatusCode, String)> {
    let metric = sqlx::query_as::<_, MetricPool>("SELECT * FROM metric_pools WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Metric not found".to_string()))?;

    // Validate SQL
    query::validate_sql(&metric.sql_query)
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    let ds = sqlx::query_as::<_, DataSource>("SELECT * FROM datasources WHERE id = ?")
        .bind(metric.datasource_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Data source not found".to_string()))?;

    let qr = match ds.db_type.as_str() {
        "mysql" => query::execute_mysql(&state, &ds, &metric.sql_query).await,
        "postgresql" => query::execute_postgres(&state, &ds, &metric.sql_query).await,
        "oracle" => query::execute_oracle(&state, &ds, &metric.sql_query).await,
        other => Err(format!("Unsupported database type: {}", other)),
    }
    .map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    let cache = serde_json::to_value(&qr.rows).ok();

    sqlx::query("UPDATE metric_pools SET result_cache=?, row_count=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(&cache)
        .bind(qr.row_count as i32)
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let updated = sqlx::query_as::<_, MetricPool>("SELECT * FROM metric_pools WHERE id = ?")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(updated))
}

/// Move a metric to a different group.
pub async fn move_metric(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
    Json(payload): Json<MoveToGroup>,
) -> Result<Json<MetricPool>, (StatusCode, String)> {
    let result = sqlx::query("UPDATE metric_pools SET group_id = ? WHERE id = ?")
        .bind(payload.group_id)
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Metric not found".to_string()));
    }

    let metric = sqlx::query_as::<_, MetricPool>("SELECT * FROM metric_pools WHERE id = ?")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(metric))
}
