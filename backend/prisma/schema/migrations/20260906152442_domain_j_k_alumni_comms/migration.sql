-- CreateTable
CREATE TABLE "fundraising_campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetMinor" INTEGER NOT NULL,
    "raisedMinor" INTEGER NOT NULL DEFAULT 0,
    "deadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "campaignId" TEXT,
    "alumniUserId" TEXT NOT NULL,
    "fund" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLEDGED',
    "receivedAt" DATETIME,
    "paymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "donations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "fundraising_campaigns" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "donations_alumniUserId_fkey" FOREIGN KEY ("alumniUserId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mentorship_pairs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mentorAlumniUserId" TEXT NOT NULL,
    "menteeStudentProfileId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mentorship_pairs_mentorAlumniUserId_fkey" FOREIGN KEY ("mentorAlumniUserId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "mentorship_pairs_menteeStudentProfileId_fkey" FOREIGN KEY ("menteeStudentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mentorship_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pairId" TEXT NOT NULL,
    "sessionDate" DATETIME NOT NULL,
    "notes" TEXT,
    "loggedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mentorship_sessions_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "mentorship_pairs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "alumni_chapters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "presidentAlumniUserId" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "nextEventAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "dataJson" TEXT,
    "readAt" DATETIME,
    "sourceModule" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notifications_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "audienceJson" TEXT NOT NULL,
    "templateKey" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channels" TEXT NOT NULL,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "audienceJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedByUserId" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "email_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "payloadJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ai_interactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ai_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_alumni_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "batchId" TEXT,
    "graduationYear" INTEGER,
    "companyId" TEXT,
    "currentRole" TEXT,
    "location" TEXT,
    "chapterId" TEXT,
    "engagementStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "alumni_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "alumni_profiles_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "alumni_chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_alumni_profiles" ("batchId", "chapterId", "companyId", "createdAt", "currentRole", "engagementStatus", "graduationYear", "id", "institutionId", "location", "updatedAt", "userId") SELECT "batchId", "chapterId", "companyId", "createdAt", "currentRole", "engagementStatus", "graduationYear", "id", "institutionId", "location", "updatedAt", "userId" FROM "alumni_profiles";
DROP TABLE "alumni_profiles";
ALTER TABLE "new_alumni_profiles" RENAME TO "alumni_profiles";
CREATE UNIQUE INDEX "alumni_profiles_userId_key" ON "alumni_profiles"("userId");
CREATE INDEX "alumni_profiles_institutionId_idx" ON "alumni_profiles"("institutionId");
CREATE INDEX "alumni_profiles_graduationYear_idx" ON "alumni_profiles"("graduationYear");
CREATE TABLE "new_donation_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "donation_payments_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "donation_payments_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_donation_payments" ("createdAt", "donationId", "id", "paymentId", "updatedAt") SELECT "createdAt", "donationId", "id", "paymentId", "updatedAt" FROM "donation_payments";
DROP TABLE "donation_payments";
ALTER TABLE "new_donation_payments" RENAME TO "donation_payments";
CREATE UNIQUE INDEX "donation_payments_paymentId_key" ON "donation_payments"("paymentId");
CREATE INDEX "donation_payments_paymentId_idx" ON "donation_payments"("paymentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "fundraising_campaigns_institutionId_idx" ON "fundraising_campaigns"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "fundraising_campaigns_institutionId_name_key" ON "fundraising_campaigns"("institutionId", "name");

-- CreateIndex
CREATE INDEX "donations_alumniUserId_idx" ON "donations"("alumniUserId");

-- CreateIndex
CREATE INDEX "donations_campaignId_idx" ON "donations"("campaignId");

-- CreateIndex
CREATE INDEX "donations_status_idx" ON "donations"("status");

-- CreateIndex
CREATE INDEX "mentorship_pairs_menteeStudentProfileId_idx" ON "mentorship_pairs"("menteeStudentProfileId");

-- CreateIndex
CREATE INDEX "mentorship_pairs_status_idx" ON "mentorship_pairs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mentorship_pairs_mentorAlumniUserId_menteeStudentProfileId_key" ON "mentorship_pairs"("mentorAlumniUserId", "menteeStudentProfileId");

-- CreateIndex
CREATE INDEX "mentorship_sessions_pairId_idx" ON "mentorship_sessions"("pairId");

-- CreateIndex
CREATE INDEX "alumni_chapters_institutionId_idx" ON "alumni_chapters"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "alumni_chapters_institutionId_city_key" ON "alumni_chapters"("institutionId", "city");

-- CreateIndex
CREATE INDEX "notifications_recipientUserId_idx" ON "notifications"("recipientUserId");

-- CreateIndex
CREATE INDEX "notifications_recipientUserId_readAt_idx" ON "notifications"("recipientUserId", "readAt");

-- CreateIndex
CREATE INDEX "broadcasts_institutionId_idx" ON "broadcasts"("institutionId");

-- CreateIndex
CREATE INDEX "broadcasts_senderUserId_idx" ON "broadcasts"("senderUserId");

-- CreateIndex
CREATE INDEX "announcements_institutionId_idx" ON "announcements"("institutionId");

-- CreateIndex
CREATE INDEX "announcements_status_idx" ON "announcements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_userId_idx" ON "push_tokens"("userId");

-- CreateIndex
CREATE INDEX "email_log_recipientEmail_idx" ON "email_log"("recipientEmail");

-- CreateIndex
CREATE INDEX "email_log_status_idx" ON "email_log"("status");

-- CreateIndex
CREATE INDEX "ai_interactions_userId_idx" ON "ai_interactions"("userId");

-- CreateIndex
CREATE INDEX "ai_interactions_feature_idx" ON "ai_interactions"("feature");
