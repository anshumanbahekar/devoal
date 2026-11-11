import { renameSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

// GitHub Pages cannot serve POST route handlers. Keep the runtime tutor route
// for server deployments, and exclude it only while producing the static site.
const route = resolve("src/app/api/tutor/route.ts");
const parked = resolve(".tutor-route-for-pages.ts");
renameSync(route, parked);
try {
  const result = spawnSync("npm", ["run", "build"], {
    stdio: "inherit", shell: process.platform === "win32",
    env: { ...process.env, STATIC_EXPORT: "1" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status || 1;
} finally {
  renameSync(parked, route);
}
