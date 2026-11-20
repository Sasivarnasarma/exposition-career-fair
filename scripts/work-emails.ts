import "./load-env";
import { runEmailWorker } from "../src/server/email/worker";
import { getDatabase } from "../src/server/db";
runEmailWorker()
  .then((result) => console.log(JSON.stringify(result)))
  .catch(() => {
    console.error("Email worker unavailable");
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getDatabase().$disconnect();
    } catch {
      /* Already reported safely. */
    }
  });
