/**
 * Runs each specialist as a container on the Docker engine this worker can
 * reach through its socket — the launcher the framework ships, and the one
 * the local compose stack uses.
 *
 * The specialist needs more than its per-dispatch variables: its own
 * credentials, the framework coordinates it clones its agent and skill files
 * from, and the model it runs on. Those are named in `SPECIALIST_FORWARD_ENV`
 * and copied from this worker's own environment at startup, so the worker
 * is the one place they are configured. A named variable that is unset fails
 * the worker at startup rather than every specialist at launch.
 *
 * Exited containers are left in place, not auto-removed: `docker logs` is the
 * only record of what a specialist did that never reached the tracker. They
 * carry the `itp.role=specialist` label, so
 * `docker container prune --filter label=itp.role=specialist` clears them.
 */

import { dockerErrorMessage, type DockerRequest } from "./docker-engine.js";
import type { SpecialistEnvVar, SpecialistLauncher, SpecialistLaunchRequest, SpecialistStatus } from "./specialist-launcher.js";

export const SPECIALIST_ROLE_LABEL = "itp.role";
export const SPECIALIST_STORY_LABEL = "itp.story";

export interface DockerLauncherConfig {
  readonly socketPath: string;
  readonly image: string;
  /** A user-defined Docker network to attach to; null leaves the engine's default bridge. */
  readonly network: string | null;
  /** Resolved at startup from `SPECIALIST_FORWARD_ENV`. */
  readonly forwardedEnvironment: readonly SpecialistEnvVar[];
}

export function loadDockerLauncherConfig(env: NodeJS.ProcessEnv): DockerLauncherConfig {
  const image = env.SPECIALIST_IMAGE;
  if (!image) {
    throw new Error("Missing required env var SPECIALIST_IMAGE");
  }

  const names = (env.SPECIALIST_FORWARD_ENV ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  const missing = names.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`SPECIALIST_FORWARD_ENV names variables this worker does not have set: ${missing.join(", ")}`);
  }

  return {
    socketPath: env.DOCKER_SOCKET_PATH || "/var/run/docker.sock",
    image: image,
    network: env.SPECIALIST_DOCKER_NETWORK || null,
    forwardedEnvironment: names.map((name) => ({ name: name, value: env[name] as string })),
  };
}

/**
 * The engine's `fromImage` pulls every tag of a repository when no tag is
 * given, so a pull always names one: the reference's own, or `latest`.
 */
export function imagePullQuery(image: string): string {
  if (image.includes("@")) {
    return `fromImage=${encodeURIComponent(image)}`;
  }
  const lastSlash = image.lastIndexOf("/");
  const lastColon = image.lastIndexOf(":");
  if (lastColon > lastSlash) {
    return `fromImage=${encodeURIComponent(image.slice(0, lastColon))}&tag=${encodeURIComponent(image.slice(lastColon + 1))}`;
  }
  return `fromImage=${encodeURIComponent(image)}&tag=latest`;
}

/** Docker names allow `[a-zA-Z0-9][a-zA-Z0-9_.-]`; a story id usually already fits. */
export function containerName(storyId: string, startedAtMs: number): string {
  const safeStory = storyId.toLowerCase().replace(/[^a-z0-9_.-]/g, "-");
  return `itp-specialist-${safeStory}-${startedAtMs}`;
}

/** Per-dispatch variables win over forwarded ones of the same name. */
export function mergeEnvironment(forwarded: readonly SpecialistEnvVar[], perDispatch: readonly SpecialistEnvVar[]): string[] {
  const merged = new Map<string, string>();
  for (const entry of forwarded) merged.set(entry.name, entry.value);
  for (const entry of perDispatch) merged.set(entry.name, entry.value);
  return [...merged].map(([name, value]) => `${name}=${value}`);
}

/**
 * A pull streams one JSON object per progress line and reports a failure as
 * an `error` line inside a 200 response, so the status alone does not say it
 * worked.
 */
function pullFailure(body: string): string | null {
  for (const line of body.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (typeof parsed === "object" && parsed !== null && "error" in parsed && typeof parsed.error === "string") {
        return parsed.error;
      }
    } catch {
      // A partial line is progress noise, not a failure.
    }
  }
  return null;
}

export function createDockerLauncher(
  config: DockerLauncherConfig,
  docker: DockerRequest,
  now: () => number = Date.now,
): SpecialistLauncher {
  async function pullImage(): Promise<void> {
    const response = await docker("POST", `/images/create?${imagePullQuery(config.image)}`);
    if (response.status !== 200) {
      throw new Error(`Docker could not pull ${config.image}: ${dockerErrorMessage(response)}`);
    }
    const failure = pullFailure(response.body);
    if (failure) {
      throw new Error(`Docker could not pull ${config.image}: ${failure}`);
    }
  }

  return {
    async launch(request: SpecialistLaunchRequest): Promise<string> {
      const name = containerName(request.storyId, now());
      const createPath = `/containers/create?name=${encodeURIComponent(name)}`;
      const createBody = {
        Image: config.image,
        Env: mergeEnvironment(config.forwardedEnvironment, request.environment),
        Labels: { [SPECIALIST_ROLE_LABEL]: "specialist", [SPECIALIST_STORY_LABEL]: request.storyId },
        HostConfig: config.network ? { NetworkMode: config.network } : {},
      };

      let created = await docker("POST", createPath, createBody);
      // 404 on create means the image is not on this engine yet. A published
      // image is pulled once, here, rather than requiring a manual pull first.
      if (created.status === 404) {
        await pullImage();
        created = await docker("POST", createPath, createBody);
      }
      if (created.status !== 201) {
        throw new Error(`Docker could not create the specialist container: ${dockerErrorMessage(created)}`);
      }

      const id = (JSON.parse(created.body) as { Id?: unknown }).Id;
      if (typeof id !== "string" || id.length === 0) {
        throw new Error("Docker created the specialist container but returned no id");
      }

      const started = await docker("POST", `/containers/${id}/start`);
      // 304 is "already started", which a retried activity can legitimately see.
      if (started.status !== 204 && started.status !== 304) {
        throw new Error(`Docker could not start the specialist container ${name}: ${dockerErrorMessage(started)}`);
      }
      return id;
    },

    async describe(handle: string): Promise<SpecialistStatus> {
      const response = await docker("GET", `/containers/${handle}/json`);
      // Someone removed it by hand. Treated as stopped, or the wait would
      // poll a container that can never come back for the rest of its timeout.
      if (response.status === 404) {
        return { stopped: true, detail: "container no longer exists" };
      }
      if (response.status !== 200) {
        throw new Error(`Docker could not inspect the specialist container: ${dockerErrorMessage(response)}`);
      }
      const state = (JSON.parse(response.body) as { State?: { Status?: unknown; ExitCode?: unknown } }).State;
      const status = typeof state?.Status === "string" ? state.Status : "unknown";
      const stopped = status === "exited" || status === "dead";
      const detail = stopped && typeof state?.ExitCode === "number" ? `${status} (exit code ${state.ExitCode})` : status;
      return { stopped: stopped, detail: detail };
    },
  };
}
