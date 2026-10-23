-- DEVELOPMENT DATABASE ONLY. Not part of production schema/migrations.
-- Run this explicitly against your local development database after schema.sql.
-- Existing schedules/reservations are never overwritten; re-running for a new
-- week inserts new demo events and leaves previous events intact.
USE bga_admissions_db;

SET @manila_today = DATE(UTC_TIMESTAMP() + INTERVAL 8 HOUR);
SET @saturday_offset = MOD(7 - DAYOFWEEK(@manila_today) + 7, 7);
SET @next_saturday = DATE_ADD(@manila_today, INTERVAL IF(@saturday_offset = 0, 7, @saturday_offset) DAY);

INSERT INTO orientations (title, branch, venue, description, date, start_time, end_time, capacity, reserved, status)
SELECT '[DEMO] FREE Saturday Cruise Career Orientation', demo.branch,
  CONCAT('Development test venue - ', demo.branch), 'Fictional test schedule. Do not publish in production.',
  @next_saturday, '09:00 AM', '12:00 PM', 3, 0, 'Open'
FROM (
  SELECT 'Tagum' AS branch UNION ALL SELECT 'Butuan' UNION ALL SELECT 'Pagadian' UNION ALL SELECT 'Bacolod'
) AS demo
WHERE NOT EXISTS (
  SELECT 1 FROM orientations existing
  WHERE existing.title = '[DEMO] FREE Saturday Cruise Career Orientation'
    AND existing.branch = demo.branch AND existing.date = @next_saturday
);
