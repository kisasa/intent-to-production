/**
 * Runs the client against a real HTTP server listening on a socket — a Unix
 * socket, or a named pipe on Windows — so the `socketPath` plumbing itself is
 * exercised, not just the launcher logic above it.
 */

import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDockerRequest, dockerErrorMessage } from "./docker-engine.js";

interface ReceivedRequest {
  readonly method: string | undefined;
  readonly url: string | undefined;
  readonly contentType: string | undefined;
  readonly body: string;
}

function socketPath(): string {
  const name = `itp-docker-engine-test-${process.pid}-${Date.now()}`;
  return process.platform === "win32" ? `\\\\.\\pipe\\${name}` : join(tmpdir(), `${name}.sock`);
}

let server: Server | null = null;

afterEach(async () => {
  const running = server;
  server = null;
  if (running) await new Promise<void>((resolve) => running.close(() => resolve()));
});

async function listen(status: number, responseBody: string): Promise<{ path: string; received: ReceivedRequest[] }> {
  const received: ReceivedRequest[] = [];
  const path = socketPath();
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      received.push({ method: req.method, url: req.url, contentType: req.headers["content-type"], body: Buffer.concat(chunks).toString("utf8") });
      res.statusCode = status;
      res.end(responseBody);
    });
  });
  const listening = server;
  await new Promise<void>((resolve) => listening.listen(path, () => resolve()));
  return { path: path, received: received };
}

describe("createDockerRequest", () => {
  it("sends a JSON body over the socket and returns the status and body", async () => {
    const { path, received } = await listen(201, '{"Id":"abc123"}');

    const response = await createDockerRequest(path)("POST", "/containers/create?name=x", { Image: "specialist-runner:local" });

    expect(response).toEqual({ status: 201, body: '{"Id":"abc123"}' });
    expect(received).toEqual([
      { method: "POST", url: "/containers/create?name=x", contentType: "application/json", body: '{"Image":"specialist-runner:local"}' },
    ]);
  });

  it("sends no body or content type when given none", async () => {
    const { path, received } = await listen(204, "");

    await expect(createDockerRequest(path)("POST", "/containers/abc123/start")).resolves.toEqual({ status: 204, body: "" });
    expect(received[0]?.contentType).toBeUndefined();
    expect(received[0]?.body).toBe("");
  });

  it("names the socket when the engine cannot be reached", async () => {
    const path = socketPath();
    await expect(createDockerRequest(path)("GET", "/_ping")).rejects.toThrow(`Could not reach the Docker engine at ${path}`);
  });
});

describe("dockerErrorMessage", () => {
  it("uses the engine's message field when the body is its JSON error", () => {
    expect(dockerErrorMessage({ status: 404, body: '{"message":"No such image: x"}' })).toBe("404 No such image: x");
  });

  it("falls back to the raw body", () => {
    expect(dockerErrorMessage({ status: 500, body: "  boom\n" })).toBe("500 boom");
  });
});
