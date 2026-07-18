import { describe, it, expect, vi, afterEach } from "vitest";
import { envOr } from "./env.js";

describe("envOr", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the fallback when the var is unset", () => {
    vi.stubEnv("ENV_OR_TEST", undefined as unknown as string);
    delete process.env.ENV_OR_TEST;
    expect(envOr("ENV_OR_TEST", "fallback")).toBe("fallback");
  });

  it("returns the fallback when the var is present but empty — the .env.example case", () => {
    vi.stubEnv("ENV_OR_TEST", "");
    expect(envOr("ENV_OR_TEST", "fallback")).toBe("fallback");
  });

  it("returns the var's value when it's set to something non-empty", () => {
    vi.stubEnv("ENV_OR_TEST", "explicit-value");
    expect(envOr("ENV_OR_TEST", "fallback")).toBe("explicit-value");
  });
});
