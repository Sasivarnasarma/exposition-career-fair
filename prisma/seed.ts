import "../scripts/load-env";
import { createDatabase } from "../src/server/db/factory";
import {
  careerCategories,
  opportunityTypes,
  formOptions,
} from "../src/shared/form-options";

async function seed() {
  const db = createDatabase();
  try {
    await db.$transaction(
      async (tx) => {
        // Insert missing catalog entries only. Never reset operator settings on a reseed.
        await tx.eventEdition.createMany({
          skipDuplicates: true,
          data: [
            {
              id: "issue-22-2027",
              name: "Exposition Issue 22 Career Fair",
              year: 2027,
              privacyVersion: "draft-not-for-consent",
              registrationOpen: false,
            },
          ],
        });
        await tx.careerCategory.createMany({
          skipDuplicates: true,
          data: careerCategories.map((category, sortOrder) => ({
            id: category.id,
            label: category.label,
            sortOrder,
          })),
        });
        await tx.careerPosition.createMany({
          skipDuplicates: true,
          data: careerCategories.flatMap((category) =>
            category.positions.map(([id, label], sortOrder) => ({
              id,
              label,
              categoryId: category.id,
              sortOrder,
            })),
          ),
        });
        await tx.opportunityType.createMany({
          skipDuplicates: true,
          data: opportunityTypes.map(([id, label], sortOrder) => ({
            id,
            label,
            sortOrder,
          })),
        });
        await tx.formOption.createMany({
          skipDuplicates: true,
          data: formOptions,
        });
        // An unlisted institution is supported by required name fields on the registration.
        await tx.institution.createMany({
          skipDuplicates: true,
          data: [{ id: "kelaniya", name: "University of Kelaniya" }],
        });
        await tx.faculty.createMany({
          skipDuplicates: true,
          data: [
            {
              id: "kelaniya-science",
              name: "Faculty of Science",
              institutionId: "kelaniya",
            },
          ],
        });
        // Degree catalog awaits confirmed programme data; free-text remains valid.
      },
      { timeout: 30000 },
    );
    console.log(
      "Form options seeded; existing registration availability preserved.",
    );
  } finally {
    await db.$disconnect();
  }
}
seed().catch((error: unknown) => {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "SEED_FAILED";
  console.error(
    JSON.stringify({
      code: /^[A-Z0-9_]{1,50}$/.test(code) ? code : "SEED_FAILED",
    }),
  );
  process.exitCode = 1;
});
