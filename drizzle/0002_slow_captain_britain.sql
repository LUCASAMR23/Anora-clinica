CREATE TABLE `procedure_items` (
	`id` text PRIMARY KEY NOT NULL,
	`procedure_id` text NOT NULL,
	`product_id` text NOT NULL,
	`planned_milli` integer NOT NULL,
	FOREIGN KEY (`procedure_id`) REFERENCES `procedures`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `procedure_item_product_unique` ON `procedure_items` (`procedure_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `procedures` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `procedures_clinic_name_unique` ON `procedures` (`clinic_id`,`name`);--> statement-breakpoint
CREATE INDEX `procedures_clinic_idx` ON `procedures` (`clinic_id`);--> statement-breakpoint
ALTER TABLE `trips` ADD `procedure_id` text REFERENCES procedures(id);
--> statement-breakpoint
UPDATE `clinics` SET `name` = 'Anora Clínica' WHERE `name` = 'Minha Clínica';
