CREATE TABLE `resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(180) NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`category` enum('setups','skripts','plugins','open-source','discord-development','maps','configs') NOT NULL,
	`tags` text,
	`link` varchar(1000),
	`fileUrl` varchar(1000),
	`fileName` varchar(255),
	`coverUrl` varchar(1000),
	`coverKey` varchar(500),
	`status` enum('draft','published') NOT NULL DEFAULT 'published',
	`isFeatured` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resources_id` PRIMARY KEY(`id`),
	CONSTRAINT `resources_slug_unique` UNIQUE(`slug`)
);
