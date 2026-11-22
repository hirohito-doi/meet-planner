CREATE TABLE `availabilities` (
	`response_id` text NOT NULL,
	`slot_id` text NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`response_id`, `slot_id`)
);
--> statement-breakpoint
CREATE INDEX `availabilities_slot_id_idx` ON `availabilities` (`slot_id`);--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`poll_id` text NOT NULL,
	`name` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`edit_token_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `responses_edit_token_hash_unique` ON `responses` (`edit_token_hash`);--> statement-breakpoint
CREATE INDEX `responses_poll_id_idx` ON `responses` (`poll_id`);