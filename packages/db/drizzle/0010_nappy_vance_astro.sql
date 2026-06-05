CREATE INDEX "ad_assets_brand_idx" ON "ad_assets" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "brand_kit_assets_brand_idx" ON "brand_kit_assets" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "brand_kit_files_brand_idx" ON "brand_kit_files" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "brands_owner_idx" ON "brands" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "brands_lead_idx" ON "brands" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "operate_projects_brand_idx" ON "operate_projects" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "pipeline_jobs_poll_idx" ON "pipeline_jobs" USING btree ("pipeline_step","status","created_at");--> statement-breakpoint
CREATE INDEX "pipeline_jobs_brand_idx" ON "pipeline_jobs" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "pipeline_jobs_lead_idx" ON "pipeline_jobs" USING btree ("lead_id");