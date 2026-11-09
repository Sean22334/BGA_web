-- MySQL standalone CMS only. Supabase already has this publication field.
-- Existing statistics were public: preserve that state, then default new rows to drafts.
SET @bga_has_publication = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'cms_stats' AND column_name = 'is_published');
SET @bga_publication_sql = IF(@bga_has_publication = 0,
  'ALTER TABLE cms_stats ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE bga_publication_statement FROM @bga_publication_sql;
EXECUTE bga_publication_statement;
DEALLOCATE PREPARE bga_publication_statement;
ALTER TABLE cms_stats ALTER COLUMN is_published SET DEFAULT 0;
