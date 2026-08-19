CREATE TABLE IF NOT EXISTS "clicks" (
	"id" bigserial NOT NULL,
	"hash" varchar(7) NOT NULL,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"referrer" text,
	"user_agent" text,
	"device_type" varchar(16),
	"browser" varchar(32),
	"os" varchar(32),
	"country" varchar(2)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "links" (
	"id" bigserial NOT NULL,
	"hash" varchar(7),
	"destination_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"click_count" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "links_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clicks_hash_time" ON "clicks" USING btree ("hash","clicked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clicks_country" ON "clicks" USING btree ("country");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_links_created" ON "links" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_links_expires" ON "links" USING btree ("expires_at");