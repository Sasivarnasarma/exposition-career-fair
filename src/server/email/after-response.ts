import "server-only";
import { after } from "next/server";
import { runEmailWorker } from "./worker";
export function dispatchAfterResponse() {
  after(async () => {
    try {
      await runEmailWorker({ maxJobs: 3 });
    } catch {
      /* Durable pending/leased work is recovered by the next worker run. */
    }
  });
}
