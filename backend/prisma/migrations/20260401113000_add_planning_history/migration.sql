-- CreateTable
CREATE TABLE `production_schedule_entries` (
    `id` VARCHAR(36) NOT NULL,
    `schedule_date` DATE NOT NULL,
    `shift` VARCHAR(20) NOT NULL,
    `area` VARCHAR(50) NOT NULL,
    `machine_id` VARCHAR(36) NOT NULL,
    `work_order_id` VARCHAR(36) NOT NULL,
    `start_time` VARCHAR(8) NOT NULL,
    `duration_minutes` INTEGER NOT NULL,
    `operator_name` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `snapshot_payload` JSON NOT NULL,
    `created_by_user_id` VARCHAR(36) NULL,
    `updated_by_user_id` VARCHAR(36) NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `idx_pse_date_shift_area_del`(`schedule_date`, `shift`, `area`, `deleted_at`),
    INDEX `idx_pse_machine_date_del`(`machine_id`, `schedule_date`, `deleted_at`),
    INDEX `idx_pse_wo_date_del`(`work_order_id`, `schedule_date`, `deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_schedule_revisions` (
    `id` VARCHAR(36) NOT NULL,
    `schedule_entry_id` VARCHAR(36) NOT NULL,
    `revision_number` INTEGER NOT NULL,
    `changed_by_user_id` VARCHAR(36) NULL,
    `change_reason` TEXT NULL,
    `before_payload` JSON NOT NULL,
    `after_payload` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_psr_entry_revision`(`schedule_entry_id`, `revision_number`),
    INDEX `idx_psr_entry_created`(`schedule_entry_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_schedule_entries` ADD CONSTRAINT `production_schedule_entries_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_schedule_entries` ADD CONSTRAINT `production_schedule_entries_work_order_id_fkey` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_schedule_entries` ADD CONSTRAINT `production_schedule_entries_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_schedule_entries` ADD CONSTRAINT `production_schedule_entries_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_schedule_revisions` ADD CONSTRAINT `production_schedule_revisions_schedule_entry_id_fkey` FOREIGN KEY (`schedule_entry_id`) REFERENCES `production_schedule_entries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_schedule_revisions` ADD CONSTRAINT `production_schedule_revisions_changed_by_user_id_fkey` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
