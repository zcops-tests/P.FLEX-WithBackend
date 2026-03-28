-- CreateTable
CREATE TABLE `work_order_management_entries` (
    `id` VARCHAR(36) NOT NULL,
    `work_order_id` VARCHAR(36) NOT NULL,
    `entered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `entered_by_user_id` VARCHAR(36) NOT NULL,
    `exited_at` DATETIME(3) NULL,
    `exited_by_user_id` VARCHAR(36) NULL,
    `exit_action` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `work_order_management_entries_work_order_id_exited_at_idx`(`work_order_id`, `exited_at`),
    INDEX `work_order_management_entries_entered_at_idx`(`entered_at`),
    INDEX `work_order_management_entries_entered_by_user_id_idx`(`entered_by_user_id`),
    INDEX `work_order_management_entries_exited_by_user_id_idx`(`exited_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `work_order_management_entries`
  ADD CONSTRAINT `work_order_management_entries_work_order_id_fkey`
  FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_order_management_entries`
  ADD CONSTRAINT `work_order_management_entries_entered_by_user_id_fkey`
  FOREIGN KEY (`entered_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_order_management_entries`
  ADD CONSTRAINT `work_order_management_entries_exited_by_user_id_fkey`
  FOREIGN KEY (`exited_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
