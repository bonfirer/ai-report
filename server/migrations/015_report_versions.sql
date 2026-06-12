-- ============================================================
-- 015: Report version history (snapshots)
-- ============================================================

CREATE TABLE IF NOT EXISTS report_versions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    report_id   INT NOT NULL,
    version     INT NOT NULL DEFAULT 1,
    html_content LONGTEXT NOT NULL,
    prompt      TEXT,
    style_key   VARCHAR(50),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    INDEX idx_report_version (report_id, version DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
