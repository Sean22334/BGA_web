-- MySQL 8 upgrade. Back up first: ALTER TABLE commits independently of transactions.
ALTER TABLE orientations MODIFY capacity INT NULL DEFAULT 50;
ALTER TABLE reservations ALTER COLUMN status SET DEFAULT 'Confirmed';
UPDATE reservations r JOIN orientations o ON o.id = r.orientation_id
SET r.status = 'Confirmed'
WHERE r.status = 'Pending' AND
  TIMESTAMP(o.date, CASE
    WHEN TRIM(o.start_time) REGEXP '^([1-9]|0[1-9]|1[0-2]):[0-5][0-9] [AaPp][Mm]$'
      THEN STR_TO_DATE(TRIM(o.start_time), '%h:%i %p')
    WHEN TRIM(o.start_time) REGEXP '^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
      THEN CAST(TRIM(o.start_time) AS TIME)
    ELSE NULL
  END) > UTC_TIMESTAMP() + INTERVAL 8 HOUR;
