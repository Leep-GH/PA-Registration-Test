CREATE TABLE `change_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pdp_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`detected_at` text NOT NULL,
	FOREIGN KEY (`pdp_id`) REFERENCES `pdps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pdps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`status` text NOT NULL,
	`registration_number` text,
	`registration_date` text,
	`website_url` text,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scrape_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_at` text NOT NULL,
	`status` text,
	`pdps_found` integer,
	`changes_detected` integer DEFAULT 0,
	`error_message` text,
	`raw_html_path` text
);
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`confirmed` integer DEFAULT false NOT NULL,
	`token` text NOT NULL,
	`subscribed_at` text NOT NULL,
	`unsubscribed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pdps_slug_unique` ON `pdps` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscribers_email_unique` ON `subscribers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscribers_token_unique` ON `subscribers` (`token`);