CREATE TABLE `polls` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`admin_token_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `polls_admin_token_hash_unique` ON `polls` (`admin_token_hash`);--> statement-breakpoint
CREATE TABLE `slots` (
	`id` text PRIMARY KEY NOT NULL,
	`poll_id` text NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `slots_poll_id_idx` ON `slots` (`poll_id`);