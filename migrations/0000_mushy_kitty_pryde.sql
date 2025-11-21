CREATE TABLE "alert_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_alert_id" integer,
	"user_id" varchar NOT NULL,
	"parent_user_id" varchar,
	"trigger_type" text NOT NULL,
	"message" text,
	"latitude" real,
	"longitude" real,
	"address" text,
	"status" text NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" varchar,
	"response_time" integer,
	"audio_recording_url" text,
	"video_recording_url" text,
	"live_stream_url" text,
	"emergency_contacts_notified" jsonb,
	"is_archived" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "community_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"verified" boolean DEFAULT false,
	"reported_by" text DEFAULT 'anonymous',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"is_favorite" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "emergency_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"trigger_type" text NOT NULL,
	"latitude" real,
	"longitude" real,
	"address" text,
	"audio_recording_url" text,
	"video_recording_url" text,
	"device_info" text,
	"is_resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"phone_number" text NOT NULL,
	"email" text,
	"relationship" text,
	"is_primary" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "family_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_user_id" varchar NOT NULL,
	"child_user_id" varchar NOT NULL,
	"relationship_type" text DEFAULT 'parent-child' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"permissions" jsonb DEFAULT '{"location": true, "emergency": true, "monitoring": true}',
	"invite_code" varchar,
	"invite_expiry" timestamp,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "family_connections_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "family_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" varchar NOT NULL,
	"parent_user_id" varchar NOT NULL,
	"child_user_id" varchar NOT NULL,
	"auto_location_sharing" boolean DEFAULT true,
	"emergency_auto_notify" boolean DEFAULT true,
	"safe_zone_notifications" boolean DEFAULT true,
	"allow_live_tracking" boolean DEFAULT false,
	"allow_emergency_override" boolean DEFAULT true,
	"quiet_hours" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "health_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"device_id" integer,
	"heart_rate" integer,
	"blood_pressure_systolic" integer,
	"blood_pressure_diastolic" integer,
	"oxygen_saturation" real,
	"skin_temperature" real,
	"stress_level" real,
	"step_count" integer,
	"calories_burned" real,
	"sleep_quality" real,
	"activity_level" text,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "home_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"address" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "home_locations_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "iot_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"device_name" text NOT NULL,
	"device_type" text NOT NULL,
	"mac_address" text,
	"bluetooth_id" text,
	"is_connected" boolean DEFAULT false,
	"battery_level" integer,
	"firmware_version" text,
	"last_connected" timestamp,
	"connection_status" text DEFAULT 'disconnected',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "iot_devices_mac_address_unique" UNIQUE("mac_address")
);
--> statement-breakpoint
CREATE TABLE "iot_emergency_triggers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"device_id" integer,
	"trigger_type" text NOT NULL,
	"severity" text NOT NULL,
	"sensor_data" jsonb,
	"location" jsonb,
	"is_resolved" boolean DEFAULT false,
	"response_time" integer,
	"emergency_alert_id" integer,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "live_streams" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"emergency_alert_id" integer,
	"stream_url" text NOT NULL,
	"share_link" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" varchar NOT NULL,
	"type" varchar NOT NULL,
	"otp" varchar NOT NULL,
	"is_verified" boolean DEFAULT false,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parent_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_user_id" varchar NOT NULL,
	"child_user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"is_read" boolean DEFAULT false,
	"priority" varchar DEFAULT 'normal' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "safe_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"name" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"radius" real NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stress_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"overall_stress_score" real NOT NULL,
	"heart_rate_variability" real,
	"skin_conductance" real,
	"movement_pattern" text,
	"voice_stress_indicators" jsonb,
	"behavior_pattern" text,
	"risk_level" text NOT NULL,
	"recommended_actions" text[],
	"trigger_factors" text[],
	"analysis_timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"phone_number" text,
	"whatsapp_number" text,
	"password" varchar,
	"is_verified" boolean DEFAULT false,
	"emergency_message" text DEFAULT 'Emergency! I need help. This is an automated message from Sakhi Suraksha.',
	"is_location_sharing_active" boolean DEFAULT false,
	"theme" text DEFAULT 'light',
	"voice_activation_enabled" boolean DEFAULT true,
	"shake_detection_enabled" boolean DEFAULT true,
	"community_alerts_enabled" boolean DEFAULT true,
	"sound_alerts_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_original_alert_id_emergency_alerts_id_fk" FOREIGN KEY ("original_alert_id") REFERENCES "public"."emergency_alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_parent_user_id_users_id_fk" FOREIGN KEY ("parent_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_alerts" ADD CONSTRAINT "community_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_connections" ADD CONSTRAINT "family_connections_parent_user_id_users_id_fk" FOREIGN KEY ("parent_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_connections" ADD CONSTRAINT "family_connections_child_user_id_users_id_fk" FOREIGN KEY ("child_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_device_id_iot_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."iot_devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_locations" ADD CONSTRAINT "home_locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_devices" ADD CONSTRAINT "iot_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_emergency_triggers" ADD CONSTRAINT "iot_emergency_triggers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_emergency_triggers" ADD CONSTRAINT "iot_emergency_triggers_device_id_iot_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."iot_devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_emergency_triggers" ADD CONSTRAINT "iot_emergency_triggers_emergency_alert_id_emergency_alerts_id_fk" FOREIGN KEY ("emergency_alert_id") REFERENCES "public"."emergency_alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_emergency_alert_id_emergency_alerts_id_fk" FOREIGN KEY ("emergency_alert_id") REFERENCES "public"."emergency_alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safe_zones" ADD CONSTRAINT "safe_zones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stress_analysis" ADD CONSTRAINT "stress_analysis_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");