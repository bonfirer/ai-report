-- ============================================================
-- 017: Column Profiling - sample values & statistics for better AI context
-- ============================================================

CREATE TABLE IF NOT EXISTS column_profiles (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    datasource_id   INT NOT NULL,
    table_name      VARCHAR(255) NOT NULL,
    column_name     VARCHAR(255) NOT NULL,
    distinct_count  INT DEFAULT NULL,
    null_count      INT DEFAULT NULL,
    total_count     INT DEFAULT NULL,
    min_value       VARCHAR(500) DEFAULT NULL,
    max_value       VARCHAR(500) DEFAULT NULL,
    sample_values   JSON DEFAULT NULL,
    profiled_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (datasource_id) REFERENCES datasources(id) ON DELETE CASCADE,
    UNIQUE KEY unique_col_profile (datasource_id, table_name, column_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
