CREATE TABLE `member_invites` (
	`email` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `member_invites_clinic_idx` ON `member_invites` (`clinic_id`);