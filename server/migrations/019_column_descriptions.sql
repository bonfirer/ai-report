-- ============================================================
-- 019: Column Descriptions - per-column business notes for AI SQL context
-- ============================================================

CREATE TABLE IF NOT EXISTS column_descriptions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    datasource_id   INT NOT NULL,
    table_name      VARCHAR(255) NOT NULL,
    column_name     VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (datasource_id) REFERENCES datasources(id) ON DELETE CASCADE,
    UNIQUE KEY unique_col_desc (datasource_id, table_name, column_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
