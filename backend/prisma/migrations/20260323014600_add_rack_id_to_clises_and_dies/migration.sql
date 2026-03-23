-- AlterTable
ALTER TABLE `clises`
  ADD COLUMN `rack_id` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `dies`
  ADD COLUMN `rack_id` VARCHAR(36) NULL;

-- CreateIndex
CREATE INDEX `clises_rack_id_idx` ON `clises`(`rack_id`);

-- CreateIndex
CREATE INDEX `dies_rack_id_idx` ON `dies`(`rack_id`);

-- AddForeignKey
ALTER TABLE `clises`
  ADD CONSTRAINT `clises_rack_id_fkey`
  FOREIGN KEY (`rack_id`) REFERENCES `rack_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dies`
  ADD CONSTRAINT `dies_rack_id_fkey`
  FOREIGN KEY (`rack_id`) REFERENCES `rack_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
