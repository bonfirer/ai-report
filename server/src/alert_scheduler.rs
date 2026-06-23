//! Background task that periodically evaluates enabled alert rules whose
//! `next_run_at` is due, sends emails when their condition holds, and reschedules.

use std::sync::Arc;

use chrono::Utc;
use tracing::{error, info, warn};

use crate::alert_engine;
use crate::models::AlertRule;
use crate::AppState;

/// Spawn the background alert scheduler (wakes every 10 seconds).
pub fn spawn(state: Arc<AppState>) {
    tokio::spawn(async move {
        info!("Alert scheduler started");
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
            if let Err(e) = tick(&state).await {
                error!("Alert scheduler tick error: {}", e);
            }
        }
    });
}

async fn tick(state: &Arc<AppState>) -> Result<(), String> {
    let now = Utc::now();

    let due = sqlx::query_as::<_, AlertRule>(
        "SELECT * FROM alert_rules WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?",
    )
    .bind(now)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    if due.is_empty() {
        return Ok(());
    }

    info!("Alert scheduler: {} rule(s) due", due.len());

    for rule in due {
        // Atomically claim the rule by advancing next_run_at. The conditional
        // WHERE means a concurrent tick — or a second server instance sharing
        // this database — will affect 0 rows and skip it, so an alert email is
        // never sent twice for the same due window.
        let next_run = alert_engine::compute_next_run(&rule.schedule_type, rule.cron_expr.as_deref());
        let claimed = sqlx::query(
            "UPDATE alert_rules SET next_run_at = ?, last_run_at = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?",
        )
        .bind(next_run)
        .bind(now)
        .bind(rule.id)
        .bind(now)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

        if claimed.rows_affected() == 0 {
            // Someone else already claimed this rule for this window.
            continue;
        }

        process_rule(state, &rule).await;
    }

    Ok(())
}

async fn process_rule(state: &Arc<AppState>, rule: &AlertRule) {
    // next_run_at / last_run_at were already advanced atomically by the claim
    // in tick(); here we only evaluate, log, and stamp last_triggered_at.
    match alert_engine::run_alert(state, rule, false).await {
        Ok(outcome) => {
            alert_engine::log_outcome(state, rule, &outcome, None).await;
            if outcome.status == "sent" {
                let _ = sqlx::query(
                    "UPDATE alert_rules SET last_triggered_at = CURRENT_TIMESTAMP WHERE id = ?",
                )
                .bind(rule.id)
                .execute(&state.db)
                .await;
                info!("Alert '{}' (id={}) triggered and email sent", rule.name, rule.id);
            }
        }
        Err(e) => {
            warn!("Alert '{}' (id={}) evaluation failed: {}", rule.name, rule.id, e);
            let outcome = alert_engine::AlertOutcome {
                triggered: false,
                evaluated_value: None,
                status: "failed".to_string(),
                message: "Evaluation failed".to_string(),
            };
            alert_engine::log_outcome(state, rule, &outcome, Some(&e)).await;
        }
    }
}
