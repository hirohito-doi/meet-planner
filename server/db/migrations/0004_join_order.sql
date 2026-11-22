ALTER TABLE `responses` ADD `join_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- 既にある回答者に、日程調整ごとの登録順を入れる(登録時刻、同じ時刻なら挿入順)
UPDATE `responses` SET `join_order` = (
	SELECT COUNT(*) FROM `responses` AS `earlier`
	WHERE `earlier`.`poll_id` = `responses`.`poll_id`
		AND (`earlier`.`created_at` < `responses`.`created_at`
			OR (`earlier`.`created_at` = `responses`.`created_at` AND `earlier`.`rowid` < `responses`.`rowid`))
);
