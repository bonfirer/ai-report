-- ============================================================
-- 022: Feishu (Lark) integration - deliver metric alerts to a Feishu
--      custom-bot webhook as an interactive message card, alongside email.
-- ============================================================

-- Global Feishu configuration (single row, id = 1)
CREATE TABLE IF NOT EXISTS feishu_config (
    id          INT PRIMARY KEY DEFAULT 1,
    -- Custom-bot webhook URL, e.g. https://open.feishu.cn/open-apis/bot/v2/hook/xxxx
    webhook_url VARCHAR(512) NOT NULL DEFAULT '',
    -- Optional signing secret. When set, every request is signed (加签) so
    -- Feishu can verify the caller. Leave empty to disable signing.
    secret      VARCHAR(255) NOT NULL DEFAULT '',
    enabled     TINYINT(1) NOT NULL DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed the single config row
INSERT INTO feishu_config (id, webhook_url, secret) VALUES (1, '', '')
ON DUPLICATE KEY UPDATE id = id;

-- Per-rule toggle: also push this alert to the configured Feishu webhook.
ALTER TABLE alert_rules ADD COLUMN notify_feishu TINYINT(1) NOT NULL DEFAULT 0;
