-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "distanceKm" REAL NOT NULL,
    "vehicleId" TEXT,
    "driverUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "routes_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "route_stops" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "stopName" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "route_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "route_enrollments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routeId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "route_enrollments_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "route_enrollments_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "route_stops" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "route_enrollments_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "regNo" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 50,
    "odometerKm" INTEGER NOT NULL DEFAULT 0,
    "fuelPct" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "registrationExpiry" DATETIME NOT NULL,
    "insuranceExpiry" DATETIME NOT NULL,
    "fitnessExpiry" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vehicle_documents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "staffUserId" TEXT,
    "name" TEXT NOT NULL,
    "licenseNo" TEXT NOT NULL,
    "licenseExpiry" DATETIME NOT NULL,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "dutyStatus" TEXT NOT NULL DEFAULT 'OFF_DUTY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "bus_positions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "currentStopId" TEXT,
    "speedKmh" INTEGER NOT NULL DEFAULT 0,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "etaMin" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ON_TIME',
    "pingedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bus_positions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bus_positions_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bus_positions_currentStopId_fkey" FOREIGN KEY ("currentStopId") REFERENCES "route_stops" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "service_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "costMinor" INTEGER NOT NULL DEFAULT 0,
    "serviceDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "service_records_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fuel_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "litres" REAL NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "filledAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fuel_logs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "routes_institutionId_idx" ON "routes"("institutionId");

-- CreateIndex
CREATE INDEX "routes_vehicleId_idx" ON "routes"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "routes_institutionId_name_key" ON "routes"("institutionId", "name");

-- CreateIndex
CREATE INDEX "route_stops_routeId_idx" ON "route_stops"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "route_stops_routeId_order_key" ON "route_stops"("routeId", "order");

-- CreateIndex
CREATE INDEX "route_enrollments_routeId_idx" ON "route_enrollments"("routeId");

-- CreateIndex
CREATE INDEX "route_enrollments_studentProfileId_idx" ON "route_enrollments"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "route_enrollments_studentProfileId_routeId_key" ON "route_enrollments"("studentProfileId", "routeId");

-- CreateIndex
CREATE INDEX "vehicles_institutionId_idx" ON "vehicles"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_institutionId_regNo_key" ON "vehicles"("institutionId", "regNo");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_documents_vehicleId_key" ON "vehicle_documents"("vehicleId");

-- CreateIndex
CREATE INDEX "drivers_institutionId_idx" ON "drivers"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_institutionId_licenseNo_key" ON "drivers"("institutionId", "licenseNo");

-- CreateIndex
CREATE UNIQUE INDEX "bus_positions_vehicleId_key" ON "bus_positions"("vehicleId");

-- CreateIndex
CREATE INDEX "bus_positions_routeId_idx" ON "bus_positions"("routeId");

-- CreateIndex
CREATE INDEX "service_records_vehicleId_idx" ON "service_records"("vehicleId");

-- CreateIndex
CREATE INDEX "fuel_logs_vehicleId_idx" ON "fuel_logs"("vehicleId");
