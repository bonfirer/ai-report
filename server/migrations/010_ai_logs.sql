-- ============================================================
-- 010: AI request logs
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_logs (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    request_type  VARCHAR(50) NOT NULL,
    model         VARCHAR(100),
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    duration_ms   INT DEFAULT 0,
    status        VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    context       TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
