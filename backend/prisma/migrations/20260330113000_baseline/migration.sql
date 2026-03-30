-- CreateTable
CREATE TABLE `areas` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `areas_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `permissions_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `roles_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(36) NOT NULL,
    `role_id` VARCHAR(36) NOT NULL,
    `permission_id` VARCHAR(36) NOT NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `role_permissions_role_id_permission_id_key`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shifts` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `start_time` VARCHAR(8) NOT NULL,
    `end_time` VARCHAR(8) NOT NULL,
    `crosses_midnight` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `shifts_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `role_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `failed_login_attempts` INTEGER NOT NULL DEFAULT 0,
    `last_failed_login_at` DATETIME(3) NULL,
    `locked_until` DATETIME(3) NULL,
    `last_login_at` DATETIME(3) NULL,
    `password_changed_at` DATETIME(3) NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_assigned_areas` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `area_id` VARCHAR(36) NOT NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `user_assigned_areas_user_id_area_id_key`(`user_id`, `area_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_config` (
    `id` VARCHAR(36) NOT NULL,
    `plant_name` VARCHAR(150) NOT NULL,
    `auto_logout_minutes` INTEGER NOT NULL DEFAULT 30,
    `password_expiry_warning_days` INTEGER NOT NULL DEFAULT 7,
    `password_policy_days` INTEGER NOT NULL DEFAULT 90,
    `operator_message` TEXT NULL,
    `timezone_name` VARCHAR(100) NOT NULL DEFAULT 'UTC',
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `machines` (
    `id` VARCHAR(36) NOT NULL,
    `area_id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'OPERATIVE',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `machines_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(36) NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `rotated_from_token_id` VARCHAR(36) NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `device_id` VARCHAR(100) NULL,
    `device_name` VARCHAR(150) NULL,
    `device_type` VARCHAR(50) NULL,
    `device_profile` VARCHAR(50) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `last_seen_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_sessions_user_id_idx`(`user_id`),
    INDEX `user_sessions_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(36) NULL,
    `session_id` VARCHAR(36) NULL,
    `user_name_snapshot` VARCHAR(100) NULL,
    `role_code_snapshot` VARCHAR(50) NULL,
    `entity` VARCHAR(100) NOT NULL,
    `entity_id` VARCHAR(36) NULL,
    `action` VARCHAR(50) NOT NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `correlation_id` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_created_at_idx`(`created_at`),
    INDEX `audit_logs_entity_idx`(`entity`),
    INDEX `audit_logs_entity_id_idx`(`entity_id`),
    INDEX `audit_logs_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `change_log` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `entity` VARCHAR(100) NOT NULL,
    `entity_id` VARCHAR(36) NOT NULL,
    `operation` VARCHAR(50) NOT NULL,
    `row_version` BIGINT NOT NULL,
    `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `user_id` VARCHAR(36) NULL,
    `correlation_id` VARCHAR(100) NULL,

    INDEX `change_log_changed_at_id_idx`(`changed_at`, `id`),
    INDEX `change_log_entity_entity_id_idx`(`entity`, `entity_id`),
    INDEX `change_log_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sync_mutation_log` (
    `mutation_id` VARCHAR(36) NOT NULL,
    `client_id` VARCHAR(100) NOT NULL,
    `device_profile` VARCHAR(50) NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `entity` VARCHAR(100) NOT NULL,
    `entity_id` VARCHAR(36) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `request_payload` JSON NULL,
    `response_payload` JSON NULL,
    `correlation_id` VARCHAR(100) NULL,
    `processed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sync_mutation_log_user_id_idx`(`user_id`),
    INDEX `sync_mutation_log_entity_idx`(`entity`),
    PRIMARY KEY (`mutation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_jobs` (
    `id` VARCHAR(36) NOT NULL,
    `entity_name` VARCHAR(100) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_hash` VARCHAR(64) NULL,
    `file_url` VARCHAR(500) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `total_rows` INTEGER NOT NULL DEFAULT 0,
    `valid_rows` INTEGER NOT NULL DEFAULT 0,
    `invalid_rows` INTEGER NOT NULL DEFAULT 0,
    `applied_rows` INTEGER NOT NULL DEFAULT 0,
    `summary` JSON NULL,
    `created_by_user_id` VARCHAR(36) NOT NULL,
    `correlation_id` VARCHAR(100) NULL,
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `outbox_events` (
    `id` VARCHAR(36) NOT NULL,
    `event_name` VARCHAR(150) NOT NULL,
    `aggregate_type` VARCHAR(100) NOT NULL,
    `aggregate_id` VARCHAR(36) NOT NULL,
    `payload` JSON NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `available_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `outbox_events_status_available_at_idx`(`status`, `available_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_orders` (
    `id` VARCHAR(36) NOT NULL,
    `ot_number` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'IMPORTED',
    `descripcion` TEXT NULL,
    `nro_cotizacion` VARCHAR(50) NULL,
    `nro_ficha` VARCHAR(50) NULL,
    `pedido` VARCHAR(50) NULL,
    `orden_compra` VARCHAR(100) NULL,
    `cliente_razon_social` VARCHAR(150) NULL,
    `vendedor` VARCHAR(100) NULL,
    `fecha_pedido` DATE NULL,
    `fecha_entrega` DATE NULL,
    `fecha_ingreso_planta` DATE NULL,
    `fecha_programada_produccion` DATE NULL,
    `cantidad_pedida` DECIMAL(14, 2) NULL,
    `unidad` VARCHAR(20) NULL,
    `material` VARCHAR(150) NULL,
    `ancho_mm` DECIMAL(12, 3) NULL,
    `avance_mm` DECIMAL(12, 3) NULL,
    `desarrollo_mm` DECIMAL(12, 3) NULL,
    `columnas` INTEGER NULL,
    `adhesivo` VARCHAR(100) NULL,
    `acabado` VARCHAR(100) NULL,
    `troquel` VARCHAR(100) NULL,
    `maquina_texto` VARCHAR(100) NULL,
    `total_metros` DECIMAL(14, 3) NULL,
    `total_m2` DECIMAL(14, 3) NULL,
    `observaciones_diseno` TEXT NULL,
    `observaciones_cotizacion` TEXT NULL,
    `raw_payload` JSON NULL,
    `import_hash` VARCHAR(64) NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `work_orders_ot_number_key`(`ot_number`),
    INDEX `work_orders_updated_at_idx`(`updated_at`),
    INDEX `work_orders_deleted_at_idx`(`deleted_at`),
    INDEX `work_orders_status_idx`(`status`),
    FULLTEXT INDEX `work_orders_ot_number_cliente_razon_social_descripcion_mater_idx`(`ot_number`, `cliente_razon_social`, `descripcion`, `material`, `vendedor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `work_order_import_rows` (
    `id` VARCHAR(36) NOT NULL,
    `import_job_id` VARCHAR(36) NOT NULL,
    `row_number` INTEGER NOT NULL,
    `row_status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `business_key` VARCHAR(100) NULL,
    `raw_row` JSON NOT NULL,
    `normalized_row` JSON NULL,
    `validation_errors` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `work_order_import_rows_import_job_id_idx`(`import_job_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clises` (
    `id` VARCHAR(36) NOT NULL,
    `item_code` VARCHAR(100) NOT NULL,
    `ubicacion` VARCHAR(100) NULL,
    `descripcion` TEXT NULL,
    `cliente` VARCHAR(150) NULL,
    `z_value` VARCHAR(50) NULL,
    `estandar` VARCHAR(100) NULL,
    `ancho_mm` DECIMAL(12, 3) NULL,
    `avance_mm` DECIMAL(12, 3) NULL,
    `columnas` INTEGER NULL,
    `repeticiones` INTEGER NULL,
    `numero_clises` INTEGER NULL,
    `espesor_mm` DECIMAL(10, 3) NULL,
    `fecha_ingreso` DATE NULL,
    `observaciones` TEXT NULL,
    `maquina_texto` VARCHAR(100) NULL,
    `colores_json` JSON NULL,
    `ficha_fler` VARCHAR(100) NULL,
    `metros_acumulados` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `imagen_url` VARCHAR(500) NULL,
    `raw_payload` JSON NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `rack_id` VARCHAR(36) NULL,

    UNIQUE INDEX `clises_item_code_key`(`item_code`),
    INDEX `clises_updated_at_idx`(`updated_at`),
    INDEX `clises_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clise_import_rows` (
    `id` VARCHAR(36) NOT NULL,
    `import_job_id` VARCHAR(36) NOT NULL,
    `row_number` INTEGER NOT NULL,
    `row_status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `business_key` VARCHAR(100) NULL,
    `raw_row` JSON NOT NULL,
    `normalized_row` JSON NULL,
    `validation_errors` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `clise_import_rows_import_job_id_idx`(`import_job_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clise_color_usage` (
    `id` VARCHAR(36) NOT NULL,
    `clise_id` VARCHAR(36) NOT NULL,
    `color_name` VARCHAR(100) NOT NULL,
    `meters` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `clise_color_usage_clise_id_idx`(`clise_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dies` (
    `id` VARCHAR(36) NOT NULL,
    `serie` VARCHAR(100) NOT NULL,
    `medida` VARCHAR(100) NULL,
    `ubicacion` VARCHAR(100) NULL,
    `ancho_mm` DECIMAL(12, 3) NULL,
    `avance_mm` DECIMAL(12, 3) NULL,
    `ancho_plg` DECIMAL(12, 3) NULL,
    `avance_plg` DECIMAL(12, 3) NULL,
    `z_value` VARCHAR(50) NULL,
    `columnas` INTEGER NULL,
    `repeticiones` INTEGER NULL,
    `material` VARCHAR(100) NULL,
    `forma` VARCHAR(100) NULL,
    `cliente` VARCHAR(150) NULL,
    `observaciones` TEXT NULL,
    `fecha_ingreso` DATE NULL,
    `pb` VARCHAR(50) NULL,
    `separacion_avance` VARCHAR(50) NULL,
    `estado` VARCHAR(50) NULL,
    `cantidad` INTEGER NULL,
    `almacen` VARCHAR(100) NULL,
    `metros_acumulados` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `tipo_troquel` VARCHAR(100) NULL,
    `raw_payload` JSON NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `rack_id` VARCHAR(36) NULL,

    UNIQUE INDEX `dies_serie_key`(`serie`),
    INDEX `dies_updated_at_idx`(`updated_at`),
    INDEX `dies_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `die_import_rows` (
    `id` VARCHAR(36) NOT NULL,
    `import_job_id` VARCHAR(36) NOT NULL,
    `row_number` INTEGER NOT NULL,
    `row_status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `business_key` VARCHAR(100) NULL,
    `raw_row` JSON NOT NULL,
    `normalized_row` JSON NULL,
    `validation_errors` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `die_import_rows_import_job_id_idx`(`import_job_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clise_die_links` (
    `id` VARCHAR(36) NOT NULL,
    `clise_id` VARCHAR(36) NOT NULL,
    `die_id` VARCHAR(36) NOT NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `clise_die_links_clise_id_die_id_key`(`clise_id`, `die_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clise_history` (
    `id` VARCHAR(36) NOT NULL,
    `clise_id` VARCHAR(36) NOT NULL,
    `event_date` DATETIME(3) NOT NULL,
    `event_type` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `user_id` VARCHAR(36) NULL,
    `machine_id` VARCHAR(36) NULL,
    `amount` DECIMAL(14, 3) NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `die_history` (
    `id` VARCHAR(36) NOT NULL,
    `die_id` VARCHAR(36) NOT NULL,
    `event_date` DATETIME(3) NOT NULL,
    `event_type` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `user_id` VARCHAR(36) NULL,
    `machine_id` VARCHAR(36) NULL,
    `amount` DECIMAL(14, 3) NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rack_configs` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `rack_type` VARCHAR(50) NOT NULL,
    `orientation` VARCHAR(50) NOT NULL,
    `levels_json` JSON NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_items` (
    `id` VARCHAR(36) NOT NULL,
    `work_order_id` VARCHAR(36) NULL,
    `ot_number_snapshot` VARCHAR(50) NULL,
    `client_snapshot` VARCHAR(150) NULL,
    `product_snapshot` VARCHAR(255) NULL,
    `quantity` DECIMAL(14, 3) NULL,
    `unit` VARCHAR(50) NULL,
    `rolls` INTEGER NULL,
    `millares` DECIMAL(14, 3) NULL,
    `location` VARCHAR(100) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'LIBERATED',
    `entry_date` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `pallet_id` VARCHAR(100) NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `stock_items_pallet_id_key`(`pallet_id`),
    INDEX `stock_items_updated_at_idx`(`updated_at`),
    INDEX `stock_items_deleted_at_idx`(`deleted_at`),
    INDEX `stock_items_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incidents` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `priority` VARCHAR(50) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    `work_order_id` VARCHAR(36) NULL,
    `machine_id` VARCHAR(36) NULL,
    `reported_by_user_id` VARCHAR(36) NOT NULL,
    `assigned_to_user_id` VARCHAR(36) NULL,
    `reported_at` DATETIME(3) NOT NULL,
    `root_cause` TEXT NULL,
    `machine_code_snapshot` VARCHAR(50) NULL,
    `ot_number_snapshot` VARCHAR(50) NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `incidents_code_key`(`code`),
    INDEX `incidents_reported_at_idx`(`reported_at`),
    INDEX `incidents_status_idx`(`status`),
    INDEX `incidents_updated_at_idx`(`updated_at`),
    INDEX `incidents_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `capa_actions` (
    `id` VARCHAR(36) NOT NULL,
    `incident_id` VARCHAR(36) NOT NULL,
    `description` TEXT NOT NULL,
    `action_type` VARCHAR(50) NOT NULL,
    `responsible_user_id` VARCHAR(36) NOT NULL,
    `deadline` DATE NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `completed_at` DATETIME(3) NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `capa_actions_deadline_idx`(`deadline`),
    INDEX `capa_actions_updated_at_idx`(`updated_at`),
    INDEX `capa_actions_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `print_reports` (
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
    `total_meters` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `waste_meters` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `setup_minutes` INTEGER NOT NULL DEFAULT 0,
    `run_minutes` INTEGER NOT NULL DEFAULT 0,
    `clise_id` VARCHAR(36) NULL,
    `die_id` VARCHAR(36) NULL,
    `die_type_snapshot` VARCHAR(50) NULL,
    `die_series_snapshot` VARCHAR(100) NULL,
    `die_location_snapshot` VARCHAR(100) NULL,
    `clise_status` VARCHAR(50) NULL,
    `die_status` VARCHAR(50) NULL,
    `observations` TEXT NULL,
    `production_status` VARCHAR(50) NOT NULL,
    `locked_by_user_id` VARCHAR(36) NULL,
    `locked_at` DATETIME(3) NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `print_reports_reported_at_idx`(`reported_at`),
    INDEX `print_reports_machine_id_idx`(`machine_id`),
    INDEX `print_reports_operator_id_idx`(`operator_id`),
    INDEX `print_reports_updated_at_idx`(`updated_at`),
    INDEX `print_reports_deleted_at_idx`(`deleted_at`),
    INDEX `print_reports_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `print_activities` (
    `id` VARCHAR(36) NOT NULL,
    `report_id` VARCHAR(36) NOT NULL,
    `activity_type` VARCHAR(100) NOT NULL,
    `start_time` VARCHAR(8) NOT NULL,
    `end_time` VARCHAR(8) NOT NULL,
    `duration_minutes` INTEGER NOT NULL DEFAULT 0,
    `meters` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `print_activities_report_id_idx`(`report_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `diecut_reports` (
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
    `die_id` VARCHAR(36) NULL,
    `frequency` VARCHAR(50) NULL,
    `good_units` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `waste_units` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `die_status` VARCHAR(50) NOT NULL,
    `production_status` VARCHAR(50) NOT NULL,
    `observations` TEXT NULL,
    `locked_by_user_id` VARCHAR(36) NULL,
    `locked_at` DATETIME(3) NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `diecut_reports_reported_at_idx`(`reported_at`),
    INDEX `diecut_reports_machine_id_idx`(`machine_id`),
    INDEX `diecut_reports_operator_id_idx`(`operator_id`),
    INDEX `diecut_reports_updated_at_idx`(`updated_at`),
    INDEX `diecut_reports_deleted_at_idx`(`deleted_at`),
    INDEX `diecut_reports_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `diecut_activities` (
    `id` VARCHAR(36) NOT NULL,
    `report_id` VARCHAR(36) NOT NULL,
    `activity_type` VARCHAR(100) NOT NULL,
    `start_time` VARCHAR(8) NOT NULL,
    `end_time` VARCHAR(8) NOT NULL,
    `duration_minutes` INTEGER NOT NULL DEFAULT 0,
    `quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `observations` TEXT NULL,
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `diecut_activities_report_id_idx`(`report_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `production_kpi_daily` (
    `id` VARCHAR(36) NOT NULL,
    `kpi_date` DATE NOT NULL,
    `machine_id` VARCHAR(36) NULL,
    `area_id` VARCHAR(36) NULL,
    `shift_id` VARCHAR(36) NULL,
    `good_output` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `waste_output` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `runtime_minutes` INTEGER NOT NULL DEFAULT 0,
    `downtime_minutes` INTEGER NOT NULL DEFAULT 0,
    `setup_minutes` INTEGER NOT NULL DEFAULT 0,
    `oee_value` DECIMAL(8, 4) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `production_kpi_daily_kpi_date_machine_id_area_id_shift_id_key`(`kpi_date`, `machine_id`, `area_id`, `shift_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `file_objects` (
    `id` VARCHAR(36) NOT NULL,
    `entity_name` VARCHAR(100) NOT NULL,
    `entity_id` VARCHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(150) NOT NULL,
    `file_hash` VARCHAR(64) NOT NULL,
    `size_bytes` BIGINT NOT NULL,
    `storage_provider` VARCHAR(50) NOT NULL,
    `object_key` VARCHAR(500) NOT NULL,
    `file_url` VARCHAR(1000) NULL,
    `uploaded_by_user_id` VARCHAR(36) NOT NULL,
    `virus_scan_status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `row_version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `file_objects_entity_name_entity_id_idx`(`entity_name`, `entity_id`),
    INDEX `file_objects_updated_at_idx`(`updated_at`),
    INDEX `file_objects_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_assigned_areas` ADD CONSTRAINT `user_assigned_areas_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_assigned_areas` ADD CONSTRAINT `user_assigned_areas_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `machines` ADD CONSTRAINT `machines_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `user_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `change_log` ADD CONSTRAINT `change_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sync_mutation_log` ADD CONSTRAINT `sync_mutation_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `import_jobs` ADD CONSTRAINT `import_jobs_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_order_management_entries` ADD CONSTRAINT `work_order_management_entries_work_order_id_fkey` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_order_management_entries` ADD CONSTRAINT `work_order_management_entries_entered_by_user_id_fkey` FOREIGN KEY (`entered_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_order_management_entries` ADD CONSTRAINT `work_order_management_entries_exited_by_user_id_fkey` FOREIGN KEY (`exited_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_order_import_rows` ADD CONSTRAINT `work_order_import_rows_import_job_id_fkey` FOREIGN KEY (`import_job_id`) REFERENCES `import_jobs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clises` ADD CONSTRAINT `clises_rack_id_fkey` FOREIGN KEY (`rack_id`) REFERENCES `rack_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clise_import_rows` ADD CONSTRAINT `clise_import_rows_import_job_id_fkey` FOREIGN KEY (`import_job_id`) REFERENCES `import_jobs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clise_color_usage` ADD CONSTRAINT `clise_color_usage_clise_id_fkey` FOREIGN KEY (`clise_id`) REFERENCES `clises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dies` ADD CONSTRAINT `dies_rack_id_fkey` FOREIGN KEY (`rack_id`) REFERENCES `rack_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `die_import_rows` ADD CONSTRAINT `die_import_rows_import_job_id_fkey` FOREIGN KEY (`import_job_id`) REFERENCES `import_jobs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clise_die_links` ADD CONSTRAINT `clise_die_links_clise_id_fkey` FOREIGN KEY (`clise_id`) REFERENCES `clises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clise_die_links` ADD CONSTRAINT `clise_die_links_die_id_fkey` FOREIGN KEY (`die_id`) REFERENCES `dies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clise_history` ADD CONSTRAINT `clise_history_clise_id_fkey` FOREIGN KEY (`clise_id`) REFERENCES `clises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clise_history` ADD CONSTRAINT `clise_history_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clise_history` ADD CONSTRAINT `clise_history_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `die_history` ADD CONSTRAINT `die_history_die_id_fkey` FOREIGN KEY (`die_id`) REFERENCES `dies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `die_history` ADD CONSTRAINT `die_history_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `die_history` ADD CONSTRAINT `die_history_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_items` ADD CONSTRAINT `stock_items_work_order_id_fkey` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_work_order_id_fkey` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_reported_by_user_id_fkey` FOREIGN KEY (`reported_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_assigned_to_user_id_fkey` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `capa_actions` ADD CONSTRAINT `capa_actions_incident_id_fkey` FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `capa_actions` ADD CONSTRAINT `capa_actions_responsible_user_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `print_reports` ADD CONSTRAINT `print_reports_work_order_id_fkey` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `print_reports` ADD CONSTRAINT `print_reports_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `print_reports` ADD CONSTRAINT `print_reports_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `print_reports` ADD CONSTRAINT `print_reports_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `print_reports` ADD CONSTRAINT `print_reports_clise_id_fkey` FOREIGN KEY (`clise_id`) REFERENCES `clises`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `print_reports` ADD CONSTRAINT `print_reports_die_id_fkey` FOREIGN KEY (`die_id`) REFERENCES `dies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `print_activities` ADD CONSTRAINT `print_activities_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `print_reports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diecut_reports` ADD CONSTRAINT `diecut_reports_work_order_id_fkey` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diecut_reports` ADD CONSTRAINT `diecut_reports_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diecut_reports` ADD CONSTRAINT `diecut_reports_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diecut_reports` ADD CONSTRAINT `diecut_reports_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diecut_reports` ADD CONSTRAINT `diecut_reports_die_id_fkey` FOREIGN KEY (`die_id`) REFERENCES `dies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diecut_activities` ADD CONSTRAINT `diecut_activities_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `diecut_reports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `production_kpi_daily` ADD CONSTRAINT `production_kpi_daily_machine_id_fkey` FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_kpi_daily` ADD CONSTRAINT `production_kpi_daily_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `file_objects` ADD CONSTRAINT `file_objects_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
