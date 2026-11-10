/**
 * The Docker launcher against a real engine: pull, create, start, poll to
 * exit, with the environment actually reaching the container. Opt-in, since
 * it needs a running engine and pulls a small public image:
 *
 *   ITP_DOCKER_TESTS=1 npx vitest run src/launchers/docker-launcher.integration.test.ts
 *
 * Set DOCKER_SOCKET_PATH when the engine is not at the platform default.
 */

import { afterAll, describe, expect, it } from "vitest";
import { createDockerRequest } from "./docker-engine.js";
import { createDockerLauncher, SPECIALIST_ROLE_LABEL, SPECIALIST_STORY_LABEL } from "./docker-launcher.js";

const enabled = process.env.ITP_DOCKER_TESTS === "1";
const socketPath = process.env.DOCKER_SOCKET_PATH || (process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock");
const docker = createDockerRequest(socketPath);
const created: string[] = [];

afterAll(async () => {
  for (const id of created) await docker("DELETE", `/containers/${id}?force=true`);
});

describe.skipIf(!enabled)("Docker launcher against a real engine", () => {
  it("runs a container with the merged environment and reports its exit", async () => {
    const launcher = createDockerLauncher(
      {
        socketPath: socketPath,
        // A tagged, tiny image; the launcher pulls it if this engine lacks it.
        image: "busybox:1.36",
        network: null,
        forwardedEnvironment: [{ name: "FORWARDED", value: "from-worker" }],
      },
      docker,
    );

    // busybox's default command is `sh`, which exits 0 at once with no input;
    // the environment is checked on the container's own config afterwards.
    const handle = await launcher.launch({
      storyId: "PROJ-101",
      environment: [{ name: "STORY_ID", value: "PROJ-101" }],
    });
    created.push(handle);

    let status = await launcher.describe(handle);
    for (let i = 0; i < 60 && !status.stopped; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      status = await launcher.describe(handle);
    }
    expect(status.stopped).toBe(true);

    const inspected = await docker("GET", `/containers/${handle}/json`);
    const details = JSON.parse(inspected.body) as { Config: { Env: string[]; Labels: Record<string, string> } };
    expect(details.Config.Env).toEqual(expect.arrayContaining(["FORWARDED=from-worker", "STORY_ID=PROJ-101"]));
    expect(details.Config.Labels[SPECIALIST_ROLE_LABEL]).toBe("specialist");
    expect(details.Config.Labels[SPECIALIST_STORY_LABEL]).toBe("PROJ-101");
    expect(status.detail).toBe("exited (exit code 0)");
  }, 120_000);

  it("reports a container removed by hand as stopped", async () => {
    const launcher = createDockerLauncher({ socketPath: socketPath, image: "busybox:1.36", network: null, forwardedEnvironment: [] }, docker);
    const handle = await launcher.launch({ storyId: "PROJ-102", environment: [] });
    await docker("DELETE", `/containers/${handle}?force=true`);
    await expect(launcher.describe(handle)).resolves.toEqual({ stopped: true, detail: "container no longer exists" });
  }, 120_000);
});
