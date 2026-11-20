-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "degreeProgrammeId" TEXT,
ADD COLUMN     "facultyId" TEXT;

-- CreateTable
CREATE TABLE "Faculty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DegreeProgramme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DegreeProgramme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_institutionId_name_key" ON "Faculty"("institutionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DegreeProgramme_facultyId_name_key" ON "DegreeProgramme"("facultyId", "name");

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DegreeProgramme" ADD CONSTRAINT "DegreeProgramme_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_degreeProgrammeId_fkey" FOREIGN KEY ("degreeProgrammeId") REFERENCES "DegreeProgramme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Faculty" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DegreeProgramme" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Faculty", "DegreeProgramme" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE "Faculty", "DegreeProgramme" FROM %I', api_role);
    END IF;
  END LOOP;
END $$;
