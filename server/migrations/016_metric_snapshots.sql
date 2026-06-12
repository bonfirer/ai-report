-- ============================================================
-- 016: Metric Snapshots - periodic data recording for YoY/MoM comparison
-- ============================================================

-- Snapshot schedules (which metrics to snapshot, how often)
CREATE TABLE IF NOT EXISTS metric_snapshot_schedules (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    metric_pool_id  INT NOT NULL,
    schedule_type   VARCHAR(20) NOT NULL DEFAULT 'daily',
    cron_expr       VARCHAR(100) DEFAULT NULL,
    enabled         TINYINT(1) DEFAULT 1,
    retention_days  INT DEFAULT NULL,
    last_run_at     TIMESTAMP NULL,
    next_run_at     TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (metric_pool_id) REFERENCES metric_pools(id) ON DELETE CASCADE,
    UNIQUE KEY unique_metric_schedule (metric_pool_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Snapshot data records
CREATE TABLE IF NOT EXISTS metric_snapshots (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    metric_pool_id  INT NOT NULL,
    schedule_id     INT DEFAULT NULL,
    snapshot_at     TIMESTAMP NOT NULL,
    period_type     VARCHAR(20) NOT NULL,
    period_key      VARCHAR(50) NOT NULL,
    result_data     JSON NOT NULL,
    row_count       INT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (metric_pool_id) REFERENCES metric_pools(id) ON DELETE CASCADE,
    INDEX idx_metric_period (metric_pool_id, period_type, period_key),
    INDEX idx_snapshot_time (metric_pool_id, snapshot_at DESC),
    INDEX idx_schedule (schedule_id, snapshot_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
