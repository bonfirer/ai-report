-- ============================================================
-- 006: AI Knowledge Base - accumulated business knowledge
-- ============================================================

CREATE TABLE IF NOT EXISTS knowledge_base (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    datasource_id INT NOT NULL,
    category    VARCHAR(50) NOT NULL DEFAULT 'relation',
    title       VARCHAR(255) NOT NULL,
    content     TEXT NOT NULL,
    source      VARCHAR(50) DEFAULT 'ai',
    confidence  VARCHAR(20) DEFAULT 'high',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (datasource_id) REFERENCES datasources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
