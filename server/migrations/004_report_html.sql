-- ============================================================
-- 004: Report HTML content - AI-generated H5 pages
-- ============================================================

ALTER TABLE reports ADD COLUMN html_content LONGTEXT DEFAULT NULL;
