-- ============================================================
-- 012: Add input/output fields to ai_logs
-- ============================================================

ALTER TABLE ai_logs ADD COLUMN input_params LONGTEXT DEFAULT NULL;
ALTER TABLE ai_logs ADD COLUMN output_result LONGTEXT DEFAULT NULL;
