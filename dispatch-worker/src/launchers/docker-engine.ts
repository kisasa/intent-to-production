/**
 * A minimal Docker Engine API client over its local socket — the handful of
 * calls the Docker launcher makes, through Node's own `http` with
 * `socketPath`, rather than a client library for five requests. `socketPath`
 * takes a Unix socket (`/var/run/docker.sock`) or a Windows named pipe
 * (`//./pipe/docker_engine`) alike.
 *
 * The path is unversioned on purpose: the engine then serves its own current
 * API version, and every field the launcher uses has been stable for years.
 */

import { request } from "node:http";

export interface DockerResponse {
  readonly status: number;
  readonly body: string;
}

export type DockerRequest = (method: string, path: string, body?: unknown) => Promise<DockerResponse>;

export function createDockerRequest(socketPath: string): DockerRequest {
  return (method, path, body) =>
    new Promise<DockerResponse>((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const req = request(
        {
          socketPath: socketPath,
          path: path,
          method: method,
          // The engine ignores Host, but HTTP/1.1 requires one.
          headers: payload === undefined ? { Host: "docker" } : { Host: "docker", "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
          res.on("error", reject);
        },
      );
      req.on("error", (err) => reject(new Error(`Could not reach the Docker engine at ${socketPath}: ${err.message}`)));
      if (payload !== undefined) req.write(payload);
      req.end();
    });
}

/** The engine's own error text, from its `{"message": ...}` body when it sent one. */
export function dockerErrorMessage(response: DockerResponse): string {
  try {
    const parsed: unknown = JSON.parse(response.body);
    if (typeof parsed === "object" && parsed !== null && "message" in parsed && typeof parsed.message === "string") {
      return `${response.status} ${parsed.message}`;
    }
  } catch {
    // Not JSON — fall through to the raw body.
  }
  return `${response.status} ${response.body.trim()}`;
}
