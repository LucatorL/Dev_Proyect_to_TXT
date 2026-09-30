DELETE FROM `leaderboard_profiles`
WHERE `total_files` = 0 AND `unification_count` = 0
  AND `custom_name` = 0 AND `auto_author_used` = 0
  AND NOT EXISTS (SELECT 1 FROM `leaderboard_events` WHERE `profile_id` = `leaderboard_profiles`.`id`);
