-- ============================================================
-- 005: Report refresh interval (minutes), default 1
-- ============================================================

ALTER TABLE reports ADD COLUMN refresh_interval INT DEFAULT 1;
