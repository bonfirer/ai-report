-- ============================================================
-- 008: Published HTML version for reports
-- ============================================================

ALTER TABLE reports ADD COLUMN published_html LONGTEXT DEFAULT NULL;
