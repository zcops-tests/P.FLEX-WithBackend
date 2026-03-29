ALTER TABLE `users`
  ADD COLUMN `failed_login_attempts` INTEGER NOT NULL DEFAULT 0 AFTER `active`,
  ADD COLUMN `last_failed_login_at` DATETIME(3) NULL AFTER `failed_login_attempts`,
  ADD COLUMN `locked_until` DATETIME(3) NULL AFTER `last_failed_login_at`;
