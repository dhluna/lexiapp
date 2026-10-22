// Runs the Supabase migration and its rule tests in a disposable Postgres container.
// Requires Docker. Usage: npm run test:sql
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const NAME = `lexi-sqltest-${process.pid}`;
const files = [
  "supabase/tests/00_supabase_stub.sql",
  "supabase/migrations/0001_lexi_sync.sql",
  "supabase/migrations/0002_active_packs.sql",
  "supabase/migrations/0003_reminders.sql",
  "supabase/tests/10_sync_rules.sql",
];

const docker = (args, input) =>
  execFileSync("docker", args, { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });

let failed = false;
try {
  // No published port: the database is reachable only from inside the container.
  docker(["run", "-d", "--rm", "--name", NAME, "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:16-alpine"]);
  for (let i = 0; ; i++) {
    try {
      // TCP, not the socket: the image first runs a temporary socket-only server to
      // initialise the database and restarts it, so the socket alone can answer too early.
      docker(["exec", NAME, "pg_isready", "-h", "127.0.0.1", "-U", "postgres", "-q"]);
      break;
    } catch {
      if (i > 60) throw new Error("Postgres did not start");
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  for (const file of files) {
    // psql prints NOTICE lines (the passed checks) on stderr.
    const run = spawnSync(
      "docker",
      ["exec", "-i", NAME, "psql", "-h", "127.0.0.1", "-U", "postgres", "-q", "-v", "ON_ERROR_STOP=1", "-f", "-"],
      { input: readFileSync(file, "utf8"), encoding: "utf8" },
    );
    for (const line of run.stderr.split("\n")) {
      if (line.includes("NOTICE")) console.log(line.replace(/^.*NOTICE:\s*/, "✓ "));
    }
    if (run.status !== 0) throw new Error(`${file}\n${run.stderr}`);
  }
  console.log("\nSQL: todas las reglas se cumplen.");
} catch (error) {
  failed = true;
  console.error(error.stderr || error.message);
} finally {
  try {
    docker(["stop", NAME]);
  } catch {
    // Already gone.
  }
}
process.exit(failed ? 1 : 0);
