-- ============================================================
-- 020: Conversation generation status for async AI chat.
-- Lets a chat keep generating server-side even if the client
-- navigates away, and lets the client resume/poll for the result.
-- ============================================================

ALTER TABLE conversations ADD COLUMN generation_status VARCHAR(20) DEFAULT 'idle';
ALTER TABLE conversations ADD COLUMN generation_error TEXT DEFAULT NULL;
