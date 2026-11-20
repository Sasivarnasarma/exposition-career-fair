import "./load-env";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { provisionSuperAdmin } from "../src/server/auth/provision";
import { getDatabase } from "../src/server/db";

async function main() {
  let input: unknown;
  if (process.argv.includes("--stdin")) {
    let value = "";
    for await (const chunk of process.stdin) {
      value += chunk;
      if (value.length > 4096) throw new Error("Input too large");
    }
    input = JSON.parse(value);
  } else {
    if (!process.stdin.isTTY)
      throw new Error("Use an interactive terminal or --stdin");
    let muted = false;
    const output = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) process.stdout.write(chunk, encoding);
        callback();
      },
    });
    const prompt = createInterface({
      input: process.stdin,
      output,
      terminal: true,
    });
    try {
      const name = await prompt.question("Administrator display name: ");
      const email = await prompt.question("Administrator email: ");
      process.stdout.write("Password (12-128 characters; hidden): ");
      muted = true;
      const password = await prompt.question("");
      process.stdout.write("\nConfirm password (hidden): ");
      const confirmation = await prompt.question("");
      process.stdout.write("\n");
      if (password !== confirmation) throw new Error("Passwords do not match");
      input = { name, email, password };
    } finally {
      prompt.close();
    }
  }
  const result = await provisionSuperAdmin(input);
  console.log(
    result.created
      ? "Super administrator provisioned."
      : "Super administrator already provisioned; credentials unchanged.",
  );
}
main()
  .catch(() => {
    console.error(
      "Provisioning failed. Check the input, database configuration and existing administrator state.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getDatabase().$disconnect();
    } catch {
      /* Configuration failure already reported safely. */
    }
  });
