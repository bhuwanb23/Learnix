-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "venueId" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 100,
    "organizerUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "coverFileId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "events_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_registrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "registrantUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "qrPayload" TEXT,
    "reminderAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "event_registrations_registrantUserId_fkey" FOREIGN KEY ("registrantUserId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_schedule_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "item" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_schedule_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_volunteers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_volunteers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "event_volunteers_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "organizerUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "captainStudentProfileId" TEXT,
    "tournamentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "teams_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "team_members_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fixtures" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "teamAId" TEXT NOT NULL,
    "teamBId" TEXT NOT NULL,
    "fixtureDate" DATETIME NOT NULL,
    "resultJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fixtures_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fixtures_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fixtures_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "standings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "standings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "standings_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "venue_bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "eventTitle" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "venue_bookings_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipment_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "totalUnits" INTEGER NOT NULL DEFAULT 1,
    "availableUnits" INTEGER NOT NULL DEFAULT 1,
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "equipment_issues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" DATETIME NOT NULL,
    "returnedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "equipment_issues_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "equipment_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "equipment_issues_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "events_institutionId_idx" ON "events"("institutionId");

-- CreateIndex
CREATE INDEX "events_category_idx" ON "events"("category");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "event_registrations_eventId_idx" ON "event_registrations"("eventId");

-- CreateIndex
CREATE INDEX "event_registrations_registrantUserId_idx" ON "event_registrations"("registrantUserId");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_eventId_registrantUserId_key" ON "event_registrations"("eventId", "registrantUserId");

-- CreateIndex
CREATE INDEX "event_schedule_items_eventId_idx" ON "event_schedule_items"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_schedule_items_eventId_day_order_key" ON "event_schedule_items"("eventId", "day", "order");

-- CreateIndex
CREATE INDEX "event_volunteers_eventId_idx" ON "event_volunteers"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_volunteers_eventId_studentProfileId_key" ON "event_volunteers"("eventId", "studentProfileId");

-- CreateIndex
CREATE INDEX "tournaments_institutionId_idx" ON "tournaments"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_institutionId_name_key" ON "tournaments"("institutionId", "name");

-- CreateIndex
CREATE INDEX "teams_tournamentId_idx" ON "teams"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_institutionId_name_key" ON "teams"("institutionId", "name");

-- CreateIndex
CREATE INDEX "team_members_teamId_idx" ON "team_members"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_studentProfileId_key" ON "team_members"("teamId", "studentProfileId");

-- CreateIndex
CREATE INDEX "fixtures_tournamentId_idx" ON "fixtures"("tournamentId");

-- CreateIndex
CREATE INDEX "fixtures_fixtureDate_idx" ON "fixtures"("fixtureDate");

-- CreateIndex
CREATE INDEX "standings_tournamentId_idx" ON "standings"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "standings_tournamentId_teamId_key" ON "standings"("tournamentId", "teamId");

-- CreateIndex
CREATE INDEX "venues_institutionId_idx" ON "venues"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "venues_institutionId_name_key" ON "venues"("institutionId", "name");

-- CreateIndex
CREATE INDEX "venue_bookings_venueId_idx" ON "venue_bookings"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "venue_bookings_venueId_date_timeSlot_key" ON "venue_bookings"("venueId", "date", "timeSlot");

-- CreateIndex
CREATE INDEX "equipment_items_institutionId_idx" ON "equipment_items"("institutionId");

-- CreateIndex
CREATE INDEX "equipment_issues_itemId_idx" ON "equipment_issues"("itemId");

-- CreateIndex
CREATE INDEX "equipment_issues_studentProfileId_idx" ON "equipment_issues"("studentProfileId");
