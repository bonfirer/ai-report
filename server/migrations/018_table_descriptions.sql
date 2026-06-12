-- ============================================================
-- 018: Table Descriptions - per-table business notes for AI SQL context
-- ============================================================

CREATE TABLE IF NOT EXISTS table_descriptions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    datasource_id   INT NOT NULL,
    table_name      VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (datasource_id) REFERENCES datasources(id) ON DELETE CASCADE,
    UNIQUE KEY unique_table_desc (datasource_id, table_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
