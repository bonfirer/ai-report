-- ============================================================
-- 014: Report design score + User achievements
-- ============================================================

ALTER TABLE reports ADD COLUMN design_score JSON DEFAULT NULL;

CREATE TABLE IF NOT EXISTS achievements (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    achievement VARCHAR(100) NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_achievement (user_id, achievement)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
