-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "isbn" TEXT,
    "category" TEXT,
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "availableCopies" INTEGER NOT NULL DEFAULT 1,
    "rackLocation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "digital_resources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "license" TEXT,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "digital_access_grants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "programId" TEXT,
    "batchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "digital_access_grants_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "digital_resources" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "digital_access_grants_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "digital_access_grants_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_procurements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "costMinor" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "book_issues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME NOT NULL,
    "returnDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "issuedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "book_issues_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "book_issues_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookIssueId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "daysOverdue" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "waivedReason" TEXT,
    "paidPaymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fines_bookIssueId_fkey" FOREIGN KEY ("bookIssueId") REFERENCES "book_issues" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "book_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "book_requests_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "hostel_blocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wardenUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockId" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "occupiedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "rooms_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "hostel_blocks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "bedNo" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VACANT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "beds_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "hostel_allocations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentProfileId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "fromDate" DATETIME NOT NULL,
    "toDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "hostel_allocations_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "hostel_allocations_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mess_menu_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "meal" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "isVeg" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "meal_attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "meal" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "meal_attendance_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mess_feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentProfileId" TEXT NOT NULL,
    "mealDate" DATETIME NOT NULL,
    "meal" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mess_feedback_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "gate_passes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentProfileId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "outAt" DATETIME NOT NULL,
    "expectedInAt" DATETIME NOT NULL,
    "actualInAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "gate_passes_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "hostel_complaints" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentProfileId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedToUserId" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "hostel_complaints_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "visitingStudentProfileId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "checkInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'IN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "visitors_visitingStudentProfileId_fkey" FOREIGN KEY ("visitingStudentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_fine_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "bookIssueId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fine_payments_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fine_payments_bookIssueId_fkey" FOREIGN KEY ("bookIssueId") REFERENCES "book_issues" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_fine_payments" ("bookIssueId", "createdAt", "id", "paymentId", "updatedAt") SELECT "bookIssueId", "createdAt", "id", "paymentId", "updatedAt" FROM "fine_payments";
DROP TABLE "fine_payments";
ALTER TABLE "new_fine_payments" RENAME TO "fine_payments";
CREATE UNIQUE INDEX "fine_payments_paymentId_key" ON "fine_payments"("paymentId");
CREATE INDEX "fine_payments_paymentId_idx" ON "fine_payments"("paymentId");
CREATE TABLE "new_hostel_rent_dues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT,
    "allocationId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "hostel_rent_dues_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "hostel_rent_dues_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "hostel_allocations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_hostel_rent_dues" ("allocationId", "amountMinor", "createdAt", "id", "month", "paymentId", "status", "updatedAt") SELECT "allocationId", "amountMinor", "createdAt", "id", "month", "paymentId", "status", "updatedAt" FROM "hostel_rent_dues";
DROP TABLE "hostel_rent_dues";
ALTER TABLE "new_hostel_rent_dues" RENAME TO "hostel_rent_dues";
CREATE UNIQUE INDEX "hostel_rent_dues_paymentId_key" ON "hostel_rent_dues"("paymentId");
CREATE UNIQUE INDEX "hostel_rent_dues_allocationId_month_key" ON "hostel_rent_dues"("allocationId", "month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "books_institutionId_idx" ON "books"("institutionId");

-- CreateIndex
CREATE INDEX "books_title_idx" ON "books"("title");

-- CreateIndex
CREATE INDEX "digital_resources_institutionId_idx" ON "digital_resources"("institutionId");

-- CreateIndex
CREATE INDEX "digital_access_grants_resourceId_idx" ON "digital_access_grants"("resourceId");

-- CreateIndex
CREATE INDEX "book_procurements_institutionId_idx" ON "book_procurements"("institutionId");

-- CreateIndex
CREATE INDEX "book_issues_bookId_idx" ON "book_issues"("bookId");

-- CreateIndex
CREATE INDEX "book_issues_studentProfileId_idx" ON "book_issues"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "book_issues_bookId_studentProfileId_returnDate_key" ON "book_issues"("bookId", "studentProfileId", "returnDate");

-- CreateIndex
CREATE UNIQUE INDEX "fines_bookIssueId_key" ON "fines"("bookIssueId");

-- CreateIndex
CREATE INDEX "fines_bookIssueId_idx" ON "fines"("bookIssueId");

-- CreateIndex
CREATE INDEX "book_requests_studentProfileId_idx" ON "book_requests"("studentProfileId");

-- CreateIndex
CREATE INDEX "book_requests_status_idx" ON "book_requests"("status");

-- CreateIndex
CREATE INDEX "hostel_blocks_institutionId_idx" ON "hostel_blocks"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "hostel_blocks_institutionId_name_key" ON "hostel_blocks"("institutionId", "name");

-- CreateIndex
CREATE INDEX "rooms_blockId_idx" ON "rooms"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_blockId_number_key" ON "rooms"("blockId", "number");

-- CreateIndex
CREATE INDEX "beds_roomId_idx" ON "beds"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "beds_roomId_bedNo_key" ON "beds"("roomId", "bedNo");

-- CreateIndex
CREATE INDEX "hostel_allocations_studentProfileId_idx" ON "hostel_allocations"("studentProfileId");

-- CreateIndex
CREATE INDEX "hostel_allocations_bedId_idx" ON "hostel_allocations"("bedId");

-- CreateIndex
CREATE INDEX "hostel_allocations_status_idx" ON "hostel_allocations"("status");

-- CreateIndex
CREATE INDEX "mess_menu_items_institutionId_idx" ON "mess_menu_items"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "mess_menu_items_institutionId_dayOfWeek_meal_key" ON "mess_menu_items"("institutionId", "dayOfWeek", "meal");

-- CreateIndex
CREATE INDEX "meal_attendance_studentProfileId_idx" ON "meal_attendance"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "meal_attendance_date_meal_studentProfileId_key" ON "meal_attendance"("date", "meal", "studentProfileId");

-- CreateIndex
CREATE INDEX "mess_feedback_studentProfileId_idx" ON "mess_feedback"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "mess_feedback_mealDate_meal_studentProfileId_key" ON "mess_feedback"("mealDate", "meal", "studentProfileId");

-- CreateIndex
CREATE INDEX "gate_passes_studentProfileId_idx" ON "gate_passes"("studentProfileId");

-- CreateIndex
CREATE INDEX "gate_passes_status_idx" ON "gate_passes"("status");

-- CreateIndex
CREATE INDEX "hostel_complaints_studentProfileId_idx" ON "hostel_complaints"("studentProfileId");

-- CreateIndex
CREATE INDEX "hostel_complaints_status_idx" ON "hostel_complaints"("status");

-- CreateIndex
CREATE INDEX "visitors_visitingStudentProfileId_idx" ON "visitors"("visitingStudentProfileId");

-- CreateIndex
CREATE INDEX "visitors_status_idx" ON "visitors"("status");
