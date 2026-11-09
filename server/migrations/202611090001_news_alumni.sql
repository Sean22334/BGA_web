-- Standalone MySQL content collections. Existing content is preserved.
CREATE TABLE IF NOT EXISTS cms_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL DEFAULT '', category VARCHAR(20) NOT NULL DEFAULT 'news',
  summary TEXT NOT NULL, cover_image VARCHAR(500) NOT NULL DEFAULT '', body_json JSON NOT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0, published_at DATETIME(3) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (category IN ('news', 'event', 'announcement')), INDEX idx_updates_public (is_published, published_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS cms_alumni (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT '', image VARCHAR(500) NOT NULL DEFAULT '', batch VARCHAR(150) NOT NULL DEFAULT '',
  company VARCHAR(255) NOT NULL DEFAULT '', position VARCHAR(255) NOT NULL DEFAULT '',
  display_order INT NOT NULL DEFAULT 0, is_published TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (display_order >= 0), INDEX idx_alumni_public (is_published, display_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
