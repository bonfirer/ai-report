use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

use crate::models::*;
use crate::routes::query;
use crate::AppState;

/// List all datasources for a report.
pub async fn list(
    State(state): State<Arc<AppState>>,
    Path(report_id): Path<i32>,
) -> Result<Json<Vec<ReportDataSource>>, (StatusCode, String)> {
    let items = sqlx::query_as::<_, ReportDataSource>(
        "SELECT * FROM report_datasources WHERE report_id = ? ORDER BY created_at ASC",
    )
    .bind(report_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(items))
}

/// Add a datasource to a report (from metric or custom SQL).
pub async fn create(
    State(state): State<Arc<AppState>>,
    Path(report_id): Path<i32>,
    Json(payload): Json<CreateReportDataSource>,
) -> Result<(StatusCode, Json<ReportDataSource>), (StatusCode, String)> {
    // If linking from a metric, copy its result_cache
    let (result_cache, row_count): (Option<serde_json::Value>, Option<i32>) =
        if let Some(mid) = payload.metric_id {
            let metric = sqlx::query_as::<_, MetricPool>("SELECT * FROM metric_pools WHERE id = ?")
                .bind(mid)
                .fetch_optional(&state.db)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            match metric {
                Some(m) => (m.result_cache, m.row_count),
                None => (None, None),
            }
        } else {
            (None, None)
        };

    let result = sqlx::query(
        "INSERT INTO report_datasources (report_id, metric_id, name, sql_query, datasource_id, result_cache, row_count) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(report_id)
    .bind(payload.metric_id)
    .bind(&payload.name)
    .bind(&payload.sql_query)
    .bind(payload.datasource_id)
    .bind(&result_cache)
    .bind(row_count)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let item = sqlx::query_as::<_, ReportDataSource>(
        "SELECT * FROM report_datasources WHERE id = ?",
    )
    .bind(result.last_insert_id() as i32)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(item)))
}

/// Remove a datasource from a report.
pub async fn remove(
    State(state): State<Arc<AppState>>,
    Path((report_id, ds_id)): Path<(i32, i32)>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM report_datasources WHERE id = ? AND report_id = ?")
        .bind(ds_id)
        .bind(report_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Report datasource not found".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}

/// Refresh a report datasource (re-execute SQL).
pub async fn refresh(
    State(state): State<Arc<AppState>>,
    Path((report_id, ds_id)): Path<(i32, i32)>,
) -> Result<Json<ReportDataSource>, (StatusCode, String)> {
    let item = sqlx::query_as::<_, ReportDataSource>(
        "SELECT * FROM report_datasources WHERE id = ? AND report_id = ?",
    )
    .bind(ds_id)
    .bind(report_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Not found".to_string()))?;

    query::validate_sql(&item.sql_query)
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    let ds = sqlx::query_as::<_, DataSource>("SELECT * FROM datasources WHERE id = ?")
        .bind(item.datasource_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Data source not found".to_string()))?;

    let qr = match ds.db_type.as_str() {
        "mysql" => query::execute_mysql(&state, &ds, &item.sql_query).await,
        "postgresql" => query::execute_postgres(&state, &ds, &item.sql_query).await,
        "oracle" => query::execute_oracle(&state, &ds, &item.sql_query).await,
        other => Err(format!("Unsupported: {}", other)),
    }
    .map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    let cache = serde_json::to_value(&qr.rows).ok();

    sqlx::query("UPDATE report_datasources SET result_cache=?, row_count=? WHERE id=?")
        .bind(&cache)
        .bind(qr.row_count as i32)
        .bind(ds_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let updated = sqlx::query_as::<_, ReportDataSource>(
        "SELECT * FROM report_datasources WHERE id = ?",
    )
    .bind(ds_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(updated))
}
