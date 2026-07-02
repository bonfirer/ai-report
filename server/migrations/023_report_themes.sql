-- ============================================================
-- 023: Report Themes — user-curated, reusable dashboard themes.
--      A theme captures a style spec (free-form guidance) plus an optional
--      sample HTML "template" (usually taken from a report the user liked),
--      so future reports can be generated in the same visual style.
-- ============================================================

CREATE TABLE IF NOT EXISTS report_themes (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(120) NOT NULL,
    description  VARCHAR(500) NOT NULL DEFAULT '',
    -- Free-form style guidance (colors, typography, layout rules, tone).
    style_prompt MEDIUMTEXT,
    -- Optional reference dashboard HTML used as a visual template.
    sample_html  LONGTEXT,
    -- Emoji / icon shown in the picker (optional).
    emoji        VARCHAR(16) NOT NULL DEFAULT '🎨',
    -- Report this theme was captured from, if any (informational only).
    source_report_id INT DEFAULT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
