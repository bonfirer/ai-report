-- ============================================================
-- 011: AI few-shot examples (training set)
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_examples (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    datasource_id INT NOT NULL,
    question      TEXT NOT NULL,
    answer        TEXT NOT NULL,
    category      VARCHAR(50) DEFAULT 'sql',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (datasource_id) REFERENCES datasources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
