-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "website" TEXT,
    "hrContact" TEXT,
    "rating" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "postedByUserId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "packageMinorPerAnnum" INTEGER NOT NULL,
    "location" TEXT,
    "openings" INTEGER NOT NULL DEFAULT 1,
    "deadline" DATETIME,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "jobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "placement_drives" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "packageMinorPerAnnum" INTEGER NOT NULL,
    "driveDate" DATETIME NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'ON_CAMPUS',
    "eligibilityJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "placement_drives_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT,
    "driveId" TEXT,
    "studentProfileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedByUserId" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "job_applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "job_applications_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "placement_drives" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "job_applications_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "placement_offers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "ctcMinor" INTEGER NOT NULL,
    "offerDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'EXTENDED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "placement_offers_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "job_applications" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "placement_eligibility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentProfileId" TEXT NOT NULL,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "blockedReason" TEXT,
    "registeredForDrives" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "placement_eligibility_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "drive_registrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driveId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "drive_registrations_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "placement_drives" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "drive_registrations_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "companies_institutionId_idx" ON "companies"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_institutionId_name_key" ON "companies"("institutionId", "name");

-- CreateIndex
CREATE INDEX "jobs_companyId_idx" ON "jobs"("companyId");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "placement_drives_companyId_idx" ON "placement_drives"("companyId");

-- CreateIndex
CREATE INDEX "placement_drives_status_idx" ON "placement_drives"("status");

-- CreateIndex
CREATE INDEX "job_applications_studentProfileId_idx" ON "job_applications"("studentProfileId");

-- CreateIndex
CREATE INDEX "job_applications_jobId_idx" ON "job_applications"("jobId");

-- CreateIndex
CREATE INDEX "job_applications_driveId_idx" ON "job_applications"("driveId");

-- CreateIndex
CREATE INDEX "job_applications_status_idx" ON "job_applications"("status");

-- CreateIndex
CREATE INDEX "placement_offers_applicationId_idx" ON "placement_offers"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "placement_offers_applicationId_key" ON "placement_offers"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "placement_eligibility_studentProfileId_key" ON "placement_eligibility"("studentProfileId");

-- CreateIndex
CREATE INDEX "drive_registrations_driveId_idx" ON "drive_registrations"("driveId");

-- CreateIndex
CREATE INDEX "drive_registrations_studentProfileId_idx" ON "drive_registrations"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "drive_registrations_driveId_studentProfileId_key" ON "drive_registrations"("driveId", "studentProfileId");
