ALTER TABLE `stock_items`
  DROP INDEX `stock_items_pallet_id_key`,
  CHANGE COLUMN `pallet_id` `box_id` VARCHAR(100) NULL,
  ADD INDEX `stock_items_box_id_idx`(`box_id`),
  ADD UNIQUE INDEX `stock_items_ot_box_key`(`ot_number_snapshot`, `box_id`);
