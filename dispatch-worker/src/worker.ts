/**
 * Entry point: runs the worker with the Docker launcher the framework ships.
 * An operator who runs specialists elsewhere replaces this file, not
 * `run-worker.ts` — see that module's own note.
 */

import { createDockerRequest } from "./launchers/docker-engine.js";
import { createDockerLauncher, loadDockerLauncherConfig } from "./launchers/docker-launcher.js";
import { createLogger } from "./logger.js";
import { runWorker } from "./run-worker.js";
import { loadWorkerConfig } from "./worker-config.js";

const log = createLogger("dispatch-worker");

async function main(): Promise<void> {
  const config = loadWorkerConfig();
  const launcherConfig = loadDockerLauncherConfig(process.env);
  log.info(`launching specialists as ${launcherConfig.image} through the Docker engine at ${launcherConfig.socketPath}`);
  const launcher = createDockerLauncher(launcherConfig, createDockerRequest(launcherConfig.socketPath));
  await runWorker(config, launcher);
}

main().catch((err) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  log.error(`worker failed to start or crashed: ${message}`);
  process.exitCode = 1;
});
