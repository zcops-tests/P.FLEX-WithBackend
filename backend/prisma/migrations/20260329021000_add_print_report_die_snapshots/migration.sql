ALTER TABLE `print_reports`
  ADD COLUMN `die_type_snapshot` VARCHAR(50) NULL,
  ADD COLUMN `die_series_snapshot` VARCHAR(100) NULL,
  ADD COLUMN `die_location_snapshot` VARCHAR(100) NULL;
