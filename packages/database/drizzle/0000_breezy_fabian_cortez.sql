CREATE TYPE "public"."conversation_member_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('direct', 'group');--> statement-breakpoint
CREATE TABLE "chat-app-advance_account" (
	"userId" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"providerAccountId" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "chat-app-advance_account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "chat-app-advance_conversation_join_link" (
	"token" varchar(255) NOT NULL,
	"conversationId" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	CONSTRAINT "chat-app-advance_conversation_join_link_token_conversationId_pk" PRIMARY KEY("token","conversationId")
);
--> statement-breakpoint
CREATE TABLE "chat-app-advance_conversation_member" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"conversationId" varchar(255) NOT NULL,
	"userId" varchar(255) NOT NULL,
	"role" "conversation_member_role" DEFAULT 'member',
	"joinedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"lastReadAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"muted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "chat-app-advance_conversation" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"type" "conversation_type" DEFAULT 'direct',
	"closed" boolean DEFAULT false,
	"name" varchar(255),
	"description" text,
	"image" varchar(255),
	"creatorId" varchar(255),
	"isPrivate" boolean DEFAULT false,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "chat-app-advance_message" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"senderId" varchar(255) NOT NULL,
	"conversationId" varchar(255) NOT NULL,
	"repliedToId" varchar(255),
	"attachment" jsonb,
	"deletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "chat-app-advance_session" (
	"sessionToken" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat-app-advance_user_contact" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"contactId" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat-app-advance_user_setting" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"theme" varchar(20) DEFAULT 'light',
	"notifications" boolean DEFAULT true,
	"soundEnabled" boolean DEFAULT true,
	"language" varchar(10) DEFAULT 'en',
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "chat-app-advance_user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"emailVerified" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"image" varchar(255),
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone,
	CONSTRAINT "chat-app-advance_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "chat-app-advance_verification_token" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "chat-app-advance_verification_token_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "chat-app-advance_account" ADD CONSTRAINT "chat-app-advance_account_userId_chat-app-advance_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."chat-app-advance_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat-app-advance_conversation_join_link" ADD CONSTRAINT "chat-app-advance_conversation_join_link_conversationId_chat-app-advance_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."chat-app-advance_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat-app-advance_conversation_member" ADD CONSTRAINT "chat-app-advance_conversation_member_conversationId_chat-app-advance_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."chat-app-advance_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat-app-advance_conversation_member" ADD CONSTRAINT "chat-app-advance_conversation_member_userId_chat-app-advance_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."chat-app-advance_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat-app-advance_conversation" ADD CONSTRAINT "chat-app-advance_conversation_creatorId_chat-app-advance_user_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."chat-app-advance_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat-app-advance_message" ADD CONSTRAINT "chat-app-advance_message_senderId_chat-app-advance_user_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."chat-app-advance_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat-app-advance_message" ADD CONSTRAINT "chat-app-advance_message_conversationId_chat-app-advance_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."chat-app-advance_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat-app-advance_message" ADD CONSTRAINT "chat-app-advance_message_repliedToId_chat-app-advance_message_id_fk" FOREIGN KEY ("repliedToId") REFERENCES "public"."chat-app-advance_message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat-app-advance_session" ADD CONSTRAINT "chat-app-advance_session_userId_chat-app-advance_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."chat-app-advance_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat-app-advance_user_contact" ADD CONSTRAINT "chat-app-advance_user_contact_userId_chat-app-advance_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."chat-app-advance_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat-app-advance_user_contact" ADD CONSTRAINT "chat-app-advance_user_contact_contactId_chat-app-advance_user_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."chat-app-advance_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat-app-advance_user_setting" ADD CONSTRAINT "chat-app-advance_user_setting_userId_chat-app-advance_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."chat-app-advance_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "chat-app-advance_account" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_join_link_token_idx" ON "chat-app-advance_conversation_join_link" USING btree ("token");--> statement-breakpoint
CREATE INDEX "conversation_join_link_conversation_id_idx" ON "chat-app-advance_conversation_join_link" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "conversation_member_conversation_id_idx" ON "chat-app-advance_conversation_member" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "conversation_member_user_id_idx" ON "chat-app-advance_conversation_member" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_member_unique_idx" ON "chat-app-advance_conversation_member" USING btree ("conversationId","userId");--> statement-breakpoint
CREATE INDEX "conversation_type_idx" ON "chat-app-advance_conversation" USING btree ("type");--> statement-breakpoint
CREATE INDEX "message_conversation_id_idx" ON "chat-app-advance_message" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "message_replied_to_id_idx" ON "chat-app-advance_message" USING btree ("repliedToId");--> statement-breakpoint
CREATE INDEX "t_user_id_idx" ON "chat-app-advance_session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "user_contact_user_id_idx" ON "chat-app-advance_user_contact" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "user_contact_contact_id_idx" ON "chat-app-advance_user_contact" USING btree ("contactId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_contact_unique_idx" ON "chat-app-advance_user_contact" USING btree ("userId","contactId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_setting_user_id_idx" ON "chat-app-advance_user_setting" USING btree ("userId");