import { describe, expect, it } from "vitest";
import type { DockerRequest, DockerResponse } from "./docker-engine.js";
import {
  containerName,
  createDockerLauncher,
  imagePullQuery,
  loadDockerLauncherConfig,
  mergeEnvironment,
  type DockerLauncherConfig,
} from "./docker-launcher.js";

interface RecordedCall {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

/** A fake engine answering from a queue, recording every call made to it. */
function fakeDocker(responses: DockerResponse[]): { docker: DockerRequest; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const docker: DockerRequest = async (method, path, body) => {
    calls.push({ method: method, path: path, body: body });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected call ${method} ${path}`);
    return next;
  };
  return { docker: docker, calls: calls };
}

const CONFIG: DockerLauncherConfig = {
  socketPath: "/var/run/docker.sock",
  image: "specialist-runner:local",
  network: null,
  forwardedEnvironment: [
    { name: "ANTHROPIC_API_KEY", value: "anthropic-key" },
    { name: "LOG_LEVEL", value: "info" },
  ],
};

const REQUEST = {
  storyId: "PROJ-101",
  environment: [
    { name: "STORY_ID", value: "PROJ-101" },
    { name: "LOG_LEVEL", value: "debug" },
  ],
};

const created = (id: string): DockerResponse => ({ status: 201, body: JSON.stringify({ Id: id, Warnings: [] }) });
const noContent: DockerResponse = { status: 204, body: "" };

describe("loadDockerLauncherConfig", () => {
  it("resolves forwarded variables from the environment it is given", () => {
    const config = loadDockerLauncherConfig({
      SPECIALIST_IMAGE: "ghcr.io/example-org/specialist:1.0.0",
      SPECIALIST_FORWARD_ENV: "ANTHROPIC_API_KEY, FRAMEWORK_REPO",
      ANTHROPIC_API_KEY: "anthropic-key",
      FRAMEWORK_REPO: "example-org/intent-to-production",
    });
    expect(config).toEqual({
      socketPath: "/var/run/docker.sock",
      image: "ghcr.io/example-org/specialist:1.0.0",
      network: null,
      forwardedEnvironment: [
        { name: "ANTHROPIC_API_KEY", value: "anthropic-key" },
        { name: "FRAMEWORK_REPO", value: "example-org/intent-to-production" },
      ],
    });
  });

  it("takes the socket path and network when set", () => {
    const config = loadDockerLauncherConfig({
      SPECIALIST_IMAGE: "specialist-runner:local",
      DOCKER_SOCKET_PATH: "//./pipe/docker_engine",
      SPECIALIST_DOCKER_NETWORK: "itp",
    });
    expect(config.socketPath).toBe("//./pipe/docker_engine");
    expect(config.network).toBe("itp");
    expect(config.forwardedEnvironment).toEqual([]);
  });

  it("throws without an image", () => {
    expect(() => loadDockerLauncherConfig({})).toThrow(/SPECIALIST_IMAGE/);
  });

  // An empty string counts as unset: compose writes `KEY: ""` for every
  // secret a developer has not filled in yet.
  it("throws naming every forwarded variable that is unset or empty", () => {
    expect(() =>
      loadDockerLauncherConfig({
        SPECIALIST_IMAGE: "specialist-runner:local",
        SPECIALIST_FORWARD_ENV: "ANTHROPIC_API_KEY,GITHUB_TOKEN,CLAUDE_MODEL",
        GITHUB_TOKEN: "",
        CLAUDE_MODEL: "claude-opus-5-5",
      }),
    ).toThrow("SPECIALIST_FORWARD_ENV names variables this worker does not have set: ANTHROPIC_API_KEY, GITHUB_TOKEN");
  });
});

describe("imagePullQuery", () => {
  it("splits a tag off the reference", () => {
    expect(imagePullQuery("ghcr.io/example-org/specialist:1.2.0")).toBe("fromImage=ghcr.io%2Fexample-org%2Fspecialist&tag=1.2.0");
  });

  it("pulls latest rather than every tag when none is given", () => {
    expect(imagePullQuery("ghcr.io/example-org/specialist")).toBe("fromImage=ghcr.io%2Fexample-org%2Fspecialist&tag=latest");
  });

  it("does not mistake a registry port for a tag", () => {
    expect(imagePullQuery("localhost:5000/specialist")).toBe("fromImage=localhost%3A5000%2Fspecialist&tag=latest");
  });

  it("passes a digest reference through whole", () => {
    expect(imagePullQuery("ghcr.io/example-org/specialist@sha256:abc")).toBe("fromImage=ghcr.io%2Fexample-org%2Fspecialist%40sha256%3Aabc");
  });
});

describe("containerName", () => {
  it("lowercases the story id and replaces characters Docker rejects", () => {
    expect(containerName("PROJ-101", 1700000000000)).toBe("itp-specialist-proj-101-1700000000000");
    expect(containerName("A/B C", 1)).toBe("itp-specialist-a-b-c-1");
  });
});

describe("mergeEnvironment", () => {
  it("lets a per-dispatch variable win over a forwarded one of the same name", () => {
    expect(mergeEnvironment(CONFIG.forwardedEnvironment, REQUEST.environment)).toEqual([
      "ANTHROPIC_API_KEY=anthropic-key",
      "LOG_LEVEL=debug",
      "STORY_ID=PROJ-101",
    ]);
  });
});

describe("createDockerLauncher", () => {
  it("creates, labels and starts the container, returning its id", async () => {
    const { docker, calls } = fakeDocker([created("abc123"), noContent]);
    const launcher = createDockerLauncher(CONFIG, docker, () => 42);

    await expect(launcher.launch(REQUEST)).resolves.toBe("abc123");

    expect(calls).toEqual([
      {
        method: "POST",
        path: "/containers/create?name=itp-specialist-proj-101-42",
        body: {
          Image: "specialist-runner:local",
          Env: ["ANTHROPIC_API_KEY=anthropic-key", "LOG_LEVEL=debug", "STORY_ID=PROJ-101"],
          Labels: { "itp.role": "specialist", "itp.story": "PROJ-101" },
          HostConfig: {},
        },
      },
      { method: "POST", path: "/containers/abc123/start", body: undefined },
    ]);
  });

  it("attaches to the configured network", async () => {
    const { docker, calls } = fakeDocker([created("abc123"), noContent]);
    await createDockerLauncher({ ...CONFIG, network: "itp" }, docker).launch(REQUEST);
    expect((calls[0]?.body as { HostConfig: unknown }).HostConfig).toEqual({ NetworkMode: "itp" });
  });

  it("pulls the image once when the engine does not have it, then creates again", async () => {
    const { docker, calls } = fakeDocker([
      { status: 404, body: JSON.stringify({ message: "No such image: specialist-runner:local" }) },
      { status: 200, body: '{"status":"Pulling from library/specialist-runner"}\n{"status":"Download complete"}\n' },
      created("abc123"),
      noContent,
    ]);
    await expect(createDockerLauncher(CONFIG, docker).launch(REQUEST)).resolves.toBe("abc123");
    expect(calls.map((call) => `${call.method} ${call.path.split("?")[0]}`)).toEqual([
      "POST /containers/create",
      "POST /images/create",
      "POST /containers/create",
      "POST /containers/abc123/start",
    ]);
    expect(calls[1]?.path).toBe("/images/create?fromImage=specialist-runner&tag=local");
  });

  it("fails on a pull error reported inside a 200 stream", async () => {
    const { docker } = fakeDocker([
      { status: 404, body: JSON.stringify({ message: "No such image" }) },
      { status: 200, body: '{"status":"Pulling"}\n{"error":"pull access denied"}\n' },
    ]);
    await expect(createDockerLauncher(CONFIG, docker).launch(REQUEST)).rejects.toThrow("Docker could not pull specialist-runner:local: pull access denied");
  });

  it("fails with the engine's own message when create is refused", async () => {
    const { docker } = fakeDocker([{ status: 409, body: JSON.stringify({ message: "Conflict. The container name is already in use" }) }]);
    await expect(createDockerLauncher(CONFIG, docker).launch(REQUEST)).rejects.toThrow(
      "Docker could not create the specialist container: 409 Conflict. The container name is already in use",
    );
  });

  it("accepts a start that reports the container already running", async () => {
    const { docker } = fakeDocker([created("abc123"), { status: 304, body: "" }]);
    await expect(createDockerLauncher(CONFIG, docker).launch(REQUEST)).resolves.toBe("abc123");
  });

  it("fails when start is refused", async () => {
    const { docker } = fakeDocker([created("abc123"), { status: 500, body: JSON.stringify({ message: "driver failed" }) }]);
    await expect(createDockerLauncher(CONFIG, docker, () => 1).launch(REQUEST)).rejects.toThrow(
      "Docker could not start the specialist container itp-specialist-proj-101-1: 500 driver failed",
    );
  });

  it("describes a running container as not stopped", async () => {
    const { docker, calls } = fakeDocker([{ status: 200, body: JSON.stringify({ State: { Status: "running", ExitCode: 0 } }) }]);
    await expect(createDockerLauncher(CONFIG, docker).describe("abc123")).resolves.toEqual({ stopped: false, detail: "running" });
    expect(calls[0]).toEqual({ method: "GET", path: "/containers/abc123/json", body: undefined });
  });

  it("describes an exited container as stopped, with its exit code", async () => {
    const { docker } = fakeDocker([{ status: 200, body: JSON.stringify({ State: { Status: "exited", ExitCode: 1 } }) }]);
    await expect(createDockerLauncher(CONFIG, docker).describe("abc123")).resolves.toEqual({ stopped: true, detail: "exited (exit code 1)" });
  });

  it("treats a removed container as stopped rather than polling it forever", async () => {
    const { docker } = fakeDocker([{ status: 404, body: JSON.stringify({ message: "No such container" }) }]);
    await expect(createDockerLauncher(CONFIG, docker).describe("abc123")).resolves.toEqual({ stopped: true, detail: "container no longer exists" });
  });

  it("throws when the engine cannot inspect the container", async () => {
    const { docker } = fakeDocker([{ status: 500, body: "boom" }]);
    await expect(createDockerLauncher(CONFIG, docker).describe("abc123")).rejects.toThrow("Docker could not inspect the specialist container: 500 boom");
  });
});
