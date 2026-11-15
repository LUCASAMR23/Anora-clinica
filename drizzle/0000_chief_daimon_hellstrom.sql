CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`detail` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `members`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_events_clinic_idx` ON `audit_events` (`clinic_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `clinics` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lots` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`product_id` text NOT NULL,
	`code` text NOT NULL,
	`expiry_date` text NOT NULL,
	`supplier` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lots_clinic_product_code_unique` ON `lots` (`clinic_id`,`product_id`,`code`);--> statement-breakpoint
CREATE INDEX `lots_fefo_idx` ON `lots` (`clinic_id`,`product_id`,`expiry_date`);--> statement-breakpoint
CREATE TABLE `members` (
	`user_id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`display_name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `members_clinic_idx` ON `members` (`clinic_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`unit` text NOT NULL,
	`min_milli` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_clinic_name_unit_unique` ON `products` (`clinic_id`,`name`,`unit`);--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`lot_id` text NOT NULL,
	`trip_id` text,
	`location` text NOT NULL,
	`type` text NOT NULL,
	`delta_milli` integer NOT NULL,
	`reason` text,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `members`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stock_movements_balance_idx` ON `stock_movements` (`clinic_id`,`location`,`trip_id`,`lot_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_created_idx` ON `stock_movements` (`clinic_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `trip_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`lot_id` text NOT NULL,
	`product_id` text NOT NULL,
	`sent_milli` integer NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `trip_allocations_trip_idx` ON `trip_allocations` (`trip_id`);--> statement-breakpoint
CREATE TABLE `trip_items` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`product_id` text NOT NULL,
	`planned_milli` integer NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trip_item_product_unique` ON `trip_items` (`trip_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`destination` text NOT NULL,
	`responsible_id` text NOT NULL,
	`departure_date` text NOT NULL,
	`return_date` text NOT NULL,
	`status` text DEFAULT 'planning' NOT NULL,
	`created_at` integer NOT NULL,
	`closed_at` integer,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responsible_id`) REFERENCES `members`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `trips_clinic_status_idx` ON `trips` (`clinic_id`,`status`);
--> statement-breakpoint
CREATE TRIGGER `stock_movements_immutable_update` BEFORE UPDATE ON `stock_movements`
BEGIN SELECT RAISE(ABORT, 'Movimentações de estoque são imutáveis'); END;
--> statement-breakpoint
CREATE TRIGGER `stock_movements_immutable_delete` BEFORE DELETE ON `stock_movements`
BEGIN SELECT RAISE(ABORT, 'Movimentações de estoque são imutáveis'); END;
--> statement-breakpoint
CREATE TRIGGER `stock_movements_no_negative` AFTER INSERT ON `stock_movements`
WHEN (SELECT COALESCE(SUM(delta_milli), 0) FROM stock_movements
      WHERE clinic_id = NEW.clinic_id AND lot_id = NEW.lot_id
        AND location = NEW.location AND trip_id IS NEW.trip_id) < 0
BEGIN SELECT RAISE(ABORT, 'Saldo insuficiente no lote'); END;
--> statement-breakpoint
CREATE TRIGGER `audit_events_immutable_update` BEFORE UPDATE ON `audit_events`
BEGIN SELECT RAISE(ABORT, 'Auditoria é imutável'); END;
--> statement-breakpoint
CREATE TRIGGER `audit_events_immutable_delete` BEFORE DELETE ON `audit_events`
BEGIN SELECT RAISE(ABORT, 'Auditoria é imutável'); END;
