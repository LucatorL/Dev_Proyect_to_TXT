CREATE TABLE `leaderboard_events` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`file_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `leaderboard_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `leaderboard_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`secret_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`custom_name` integer DEFAULT 0 NOT NULL,
	`auto_author_used` integer DEFAULT 0 NOT NULL,
	`total_files` integer DEFAULT 0 NOT NULL,
	`unification_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leaderboard_profiles_secret_hash_unique` ON `leaderboard_profiles` (`secret_hash`);