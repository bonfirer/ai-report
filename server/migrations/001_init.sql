CREATE TABLE IF NOT EXISTS datasources (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    db_type     VARCHAR(50) NOT NULL DEFAULT 'mysql',
    host        VARCHAR(255) NOT NULL,
    port        INT NOT NULL DEFAULT 3306,
    database_name    VARCHAR(255) NOT NULL,
    username    VARCHAR(255) NOT NULL,
    password    TEXT NOT NULL,
    status      VARCHAR(20) DEFAULT 'unknown',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `schemas` (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    datasource_id   INT NOT NULL,
    schema_data     JSON NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (datasource_id) REFERENCES datasources(id) ON DELETE CASCADE,
    UNIQUE KEY unique_ds (datasource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS knowledge_graphs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    datasource_id   INT NOT NULL,
    graph_data      JSON NOT NULL,
    generated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (datasource_id) REFERENCES datasources(id) ON DELETE CASCADE,
    UNIQUE KEY unique_ds_kg (datasource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS conversations (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS messages (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    role            VARCHAR(20) NOT NULL,
    content         TEXT NOT NULL,
    metadata        JSON,
    reasoning_content TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS data_pools (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT,
    name            VARCHAR(255),
    sql_query       TEXT NOT NULL,
    datasource_id   INT NOT NULL,
    result_cache    JSON,
    row_count       INT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (datasource_id) REFERENCES datasources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reports (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(500) NOT NULL,
    description TEXT,
    pool_ids    JSON NOT NULL,
    config      JSON NOT NULL,
    data_cache  JSON,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS llm_config (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    provider    VARCHAR(50) NOT NULL DEFAULT 'openai',
    base_url    VARCHAR(500) NOT NULL DEFAULT 'https://api.openai.com/v1',
    api_key     VARCHAR(500) NOT NULL DEFAULT '',
    model       VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
    max_tokens  INT DEFAULT 4096,
    temperature DOUBLE DEFAULT 0.1,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default LLM config row if none exists
INSERT IGNORE INTO llm_config (id, provider, base_url, api_key, model) VALUES (1, 'openai', 'https://api.openai.com/v1', '', 'gpt-4o');
