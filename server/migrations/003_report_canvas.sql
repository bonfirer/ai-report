-- ============================================================
-- 003: Report Canvas - layout, publish, share
-- ============================================================

-- Add new columns to reports for canvas layout, publish status, sharing
ALTER TABLE reports ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE reports ADD COLUMN share_token VARCHAR(64) DEFAULT NULL;
ALTER TABLE reports ADD COLUMN share_public TINYINT(1) DEFAULT 0;
ALTER TABLE reports ADD COLUMN layout_config JSON DEFAULT NULL;

-- Report data sources (links between reports and metric_pools / custom queries)
CREATE TABLE IF NOT EXISTS report_datasources (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    report_id   INT NOT NULL,
    metric_id   INT DEFAULT NULL,
    name        VARCHAR(255) NOT NULL,
    sql_query   TEXT NOT NULL,
    datasource_id INT NOT NULL,
    result_cache JSON,
    row_count   INT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (datasource_id) REFERENCES datasources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
