ALTER TABLE `stock_items`
  DROP INDEX `stock_items_ot_box_key`,
  DROP INDEX `stock_items_box_id_idx`,
  ADD UNIQUE INDEX `stock_items_box_id_key`(`box_id`);
