-- ============================================================
-- 007: Report generation status for async HTML generation
-- ============================================================

ALTER TABLE reports ADD COLUMN generation_status VARCHAR(20) DEFAULT 'idle';
ALTER TABLE reports ADD COLUMN generation_error TEXT DEFAULT NULL;
