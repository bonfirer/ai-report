-- ============================================================
-- 002: Report Groups, Metric Pools, Metric Groups
-- ============================================================

-- Report groups (folders for organizing reports by scenario)
CREATE TABLE IF NOT EXISTS report_groups (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add group_id to reports (plain ALTER — error is tolerated on re-run)
ALTER TABLE reports ADD COLUMN group_id INT DEFAULT NULL;

-- Metric groups (folders for organizing saved metrics)
CREATE TABLE IF NOT EXISTS metric_groups (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Metric pools (saved/bookmarked data pools with user-given names)
CREATE TABLE IF NOT EXISTS metric_pools (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    sql_query       TEXT NOT NULL,
    datasource_id   INT NOT NULL,
    group_id        INT DEFAULT NULL,
    result_cache    JSON,
    row_count       INT,
    source_pool_id  INT DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (datasource_id) REFERENCES datasources(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES metric_groups(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
