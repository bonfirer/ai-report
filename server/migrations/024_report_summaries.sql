-- ============================================================
-- 024: Report Summaries — cached AI-generated data analysis summary.
--      One row per report (latest summary), regenerated on demand.
-- ============================================================

CREATE TABLE IF NOT EXISTS report_summaries (
    report_id    INT PRIMARY KEY,
    -- Structured JSON: { headline, highlights[], trends[], anomalies[], recommendations[] }
    summary      JSON NOT NULL,
    model        VARCHAR(120) NOT NULL DEFAULT '',
    lang         VARCHAR(10)  NOT NULL DEFAULT 'zh',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
