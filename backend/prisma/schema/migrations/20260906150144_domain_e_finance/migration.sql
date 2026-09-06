-- CreateTable
CREATE TABLE "fee_structures" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "tuitionMinor" INTEGER NOT NULL,
    "otherMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "requestedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fee_structures_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fee_structures_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fee_dues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentProfileId" TEXT NOT NULL,
    "feeStructureId" TEXT,
    "title" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "waivedReason" TEXT,
    "daysOverdue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fee_dues_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fee_dues_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "fee_structures" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "payerUserId" TEXT,
    "studentProfileId" TEXT,
    "category" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "recordedByUserId" TEXT,
    "gatewayRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "receipts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "donation_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "donation_payments_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transport_fee_dues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT,
    "studentProfileId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transport_fee_dues_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transport_fee_dues_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transport_fee_dues_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "hostel_rent_dues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT,
    "allocationId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "hostel_rent_dues_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fine_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "bookIssueId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fine_payments_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "runByUserId" TEXT NOT NULL,
    "totalMinor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "payroll_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payrollRunId" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "grossMinor" INTEGER NOT NULL,
    "deductionsMinor" INTEGER NOT NULL DEFAULT 0,
    "netMinor" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "payslipFileId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payroll_entries_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "vendor" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "budgetId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "expenses_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "departmentId" TEXT,
    "fiscalYear" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "plannedMinor" INTEGER NOT NULL,
    "spentMinor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "scholarships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "coveragePercent" INTEGER NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "scholarships_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scholarship_awards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scholarshipId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "disbursedPaymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "scholarship_awards_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "scholarships" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "scholarship_awards_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "fee_structures_institutionId_idx" ON "fee_structures"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structures_programId_academicYearId_key" ON "fee_structures"("programId", "academicYearId");

-- CreateIndex
CREATE INDEX "fee_dues_studentProfileId_idx" ON "fee_dues"("studentProfileId");

-- CreateIndex
CREATE INDEX "fee_dues_status_idx" ON "fee_dues"("status");

-- CreateIndex
CREATE INDEX "payments_institutionId_idx" ON "payments"("institutionId");

-- CreateIndex
CREATE INDEX "payments_category_idx" ON "payments"("category");

-- CreateIndex
CREATE INDEX "payments_studentProfileId_idx" ON "payments"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_institutionId_referenceNo_key" ON "payments"("institutionId", "referenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_paymentId_key" ON "receipts"("paymentId");

-- CreateIndex
CREATE INDEX "receipts_paymentId_idx" ON "receipts"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "donation_payments_paymentId_key" ON "donation_payments"("paymentId");

-- CreateIndex
CREATE INDEX "donation_payments_paymentId_idx" ON "donation_payments"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "transport_fee_dues_paymentId_key" ON "transport_fee_dues"("paymentId");

-- CreateIndex
CREATE INDEX "transport_fee_dues_studentProfileId_idx" ON "transport_fee_dues"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "transport_fee_dues_studentProfileId_academicYearId_key" ON "transport_fee_dues"("studentProfileId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "hostel_rent_dues_paymentId_key" ON "hostel_rent_dues"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "hostel_rent_dues_allocationId_month_key" ON "hostel_rent_dues"("allocationId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "fine_payments_paymentId_key" ON "fine_payments"("paymentId");

-- CreateIndex
CREATE INDEX "fine_payments_paymentId_idx" ON "fine_payments"("paymentId");

-- CreateIndex
CREATE INDEX "payroll_runs_institutionId_idx" ON "payroll_runs"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_institutionId_month_key" ON "payroll_runs"("institutionId", "month");

-- CreateIndex
CREATE INDEX "payroll_entries_payrollRunId_idx" ON "payroll_entries"("payrollRunId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_entries_payrollRunId_staffUserId_key" ON "payroll_entries"("payrollRunId", "staffUserId");

-- CreateIndex
CREATE INDEX "expenses_institutionId_idx" ON "expenses"("institutionId");

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "expenses"("status");

-- CreateIndex
CREATE INDEX "budgets_institutionId_idx" ON "budgets"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_institutionId_fiscalYear_category_departmentId_key" ON "budgets"("institutionId", "fiscalYear", "category", "departmentId");

-- CreateIndex
CREATE INDEX "scholarships_institutionId_idx" ON "scholarships"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "scholarships_institutionId_name_academicYearId_key" ON "scholarships"("institutionId", "name", "academicYearId");

-- CreateIndex
CREATE INDEX "scholarship_awards_studentProfileId_idx" ON "scholarship_awards"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "scholarship_awards_scholarshipId_studentProfileId_key" ON "scholarship_awards"("scholarshipId", "studentProfileId");
