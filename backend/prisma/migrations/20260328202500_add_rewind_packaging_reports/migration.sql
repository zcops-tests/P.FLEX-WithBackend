-- CreateTable
CREATE TABLE `rewind_reports` (
    `id` VARCHAR(36) NOT NULL,
    `reported_at` DATETIME(3) NOT NULL,
    `work_order_id` VARCHAR(36) NULL,
    `machine_id` VARCHAR(36) NOT NULL,
    `operator_id` VARCHAR(36) NOT NULL,
    `shift_id` VARCHAR(36) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    `work_order_number_snapshot` VARCHAR(50) NULL,
    `client_snapshot` VARCHAR(150) NULL,
    `product_snapshot` VARCHAR(255) NULL,
    `operator_name_snapshot` VARCHAR(100) NULL,
    `rolls_finished` INTEGER NOT NULL DEFAULT 0,
    `labels_per_roll` INTEGER NOT NULL DEFAULT 0,
    `total_labels` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `total_meters` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `waste_rolls` INTEGER NOT NULL DEFAULT 0,
    `quality_check` BOOLEAN NOT NULL DEFAULT true,
    `observations` TEXT NULL,
    `production_status` VARCHAR(50) NOT NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `rewind_reports_reported_at_idx`(`reported_at`),
    INDEX `rewind_reports_machine_id_idx`(`machine_id`),
    INDEX `rewind_reports_operator_id_idx`(`operator_id`),
    INDEX `rewind_reports_updated_at_idx`(`updated_at`),
    INDEX `rewind_reports_deleted_at_idx`(`deleted_at`),
    INDEX `rewind_reports_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `packaging_reports` (
    `id` VARCHAR(36) NOT NULL,
    `reported_at` DATETIME(3) NOT NULL,
    `work_order_id` VARCHAR(36) NULL,
    `operator_id` VARCHAR(36) NOT NULL,
    `shift_id` VARCHAR(36) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    `lot_status` VARCHAR(50) NOT NULL,
    `work_order_number_snapshot` VARCHAR(50) NULL,
    `client_snapshot` VARCHAR(150) NULL,
    `product_snapshot` VARCHAR(255) NULL,
    `operator_name_snapshot` VARCHAR(100) NULL,
    `shift_name_snapshot` VARCHAR(100) NULL,
    `rolls` INTEGER NOT NULL DEFAULT 0,
    `total_meters` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `demasia_rolls` INTEGER NOT NULL DEFAULT 0,
    `demasia_meters` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `packaging_reports_reported_at_idx`(`reported_at`),
    INDEX `packaging_reports_operator_id_idx`(`operator_id`),
    INDEX `packaging_reports_updated_at_idx`(`updated_at`),
    INDEX `packaging_reports_deleted_at_idx`(`deleted_at`),
    INDEX `packaging_reports_status_idx`(`status`),
    INDEX `packaging_reports_lot_status_idx`(`lot_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `rewind_reports` ADD CONSTRAINT `rewind_reports_work_order_id_fkey` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rewind_reports` ADD CONSTRAINT `rewind_reports_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rewind_reports` ADD CONSTRAINT `rewind_reports_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rewind_reports` ADD CONSTRAINT `rewind_reports_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packaging_reports` ADD CONSTRAINT `packaging_reports_work_order_id_fkey` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packaging_reports` ADD CONSTRAINT `packaging_reports_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packaging_reports` ADD CONSTRAINT `packaging_reports_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
