CREATE TABLE `sequence_counters` (
  `name` VARCHAR(100) NOT NULL,
  `next_value` BIGINT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `stock_items_entry_date_idx` ON `stock_items`(`entry_date`);
CREATE INDEX `stock_items_caja_idx` ON `stock_items`(`caja`);
CREATE INDEX `stock_items_location_idx` ON `stock_items`(`location`);
