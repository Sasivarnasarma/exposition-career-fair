-- Keep existing GPA values while removing the scale field and paired constraint.
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_gpa_valid";
ALTER TABLE "Registration" DROP COLUMN "gpaScale";
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_gpa_valid"
  CHECK ("gpa" IS NULL OR ("gpa" >= 0 AND "gpa" <= 99));
