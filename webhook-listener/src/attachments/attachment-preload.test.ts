import { describe, it, expect } from "vitest";
import { createAttachmentPreloader, type AttachmentPreloadConfig } from "./attachment-preload.js";
import { fakeLinear, file, issue, recordingAnthropic, silentLogger, type FakeTracker } from "./test-fakes.js";

const CONFIG: AttachmentPreloadConfig = {
  walk: { maxHops: 3, maxNodes: 40 },
  budget: { totalTokens: 1_000, maxTextFileTokens: 400, maxNativeImages: 20 },
  download: { maxFileBytes: 1_000, maxTotalBytes: 1_500 },
  fileExpirySeconds: 24 * 60 * 60,
  minRemainingFileLifeMs: 6 * 60 * 60 * 1000,
};

const UPLOAD = "https://uploads.linear.app/";
const SCOPE = { kind: "project" as const, projectId: "proj" };

function tracker(attachments: { id: string; title: string; url: string }[], files: FakeTracker["files"]): FakeTracker {
  return {
    projects: { proj: { content: "https://linear.app/example-org/issue/PROJ-1", documentContents: [] } },
    issues: { "PROJ-1": issue("PROJ-1", "", attachments) },
    files: files,
  };
}

function manifestOf(blocks: { type: string; text?: string }[]): string {
  return blocks.at(-1)?.text ?? "";
}

describe("attachment preloader", () => {
  it("places each kind of file the way a desktop session would", async () => {
    const linear = fakeLinear(
      tracker(
        [
          { id: "a", title: "Screens", url: `${UPLOAD}a` },
          { id: "b", title: "Sign-in screen", url: `${UPLOAD}b` },
          { id: "c", title: "Notes", url: `${UPLOAD}c` },
          { id: "d", title: "Spec", url: `${UPLOAD}d` },
          { id: "e", title: "Pull request", url: "https://github.com/example-org/example-web/pull/1" },
        ],
        {
          [`${UPLOAD}a`]: file("application/pdf", "%PDF tiny"),
          [`${UPLOAD}b`]: file("image/png", "png-bytes"),
          [`${UPLOAD}c`]: file("text/markdown", "# notes"),
          [`${UPLOAD}d`]: file("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx-bytes"),
        },
      ),
    );
    const anthropic = recordingAnthropic();
    const result = await createAttachmentPreloader(linear, CONFIG).preload(anthropic, SCOPE, "model", silentLogger);

    const types = result.blocks.map((b) => b.type);
    expect(types).toEqual(["text", "document", "text", "image", "text", "document", "container_upload", "text"]);
    expect(result.needsCodeExecution).toBe(true);
    expect(anthropic.uploads.map((u) => u.type)).toEqual([
      "application/pdf",
      "image/png",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);

    const manifest = manifestOf(result.blocks as { type: string; text?: string }[]);
    expect(manifest).toContain('4. "Spec" (on PROJ-1)');
    expect(manifest).toContain("$INPUT_DIR/Spec.docx");
    expect(manifest).toMatch(/5\. "Pull request" \(on PROJ-1\) — a link, not a file/);
    expect(manifest).toMatch(/Never fetch an attachment/);
  });

  it("measures files one by one and leaves them out of the pre-flight blocks", async () => {
    const linear = fakeLinear(
      tracker([{ id: "a", title: "Screens", url: `${UPLOAD}a` }], { [`${UPLOAD}a`]: file("application/pdf", "%PDF") }),
    );
    const result = await createAttachmentPreloader(linear, CONFIG).preload(
      recordingAnthropic(),
      SCOPE,
      "model",
      silentLogger,
    );
    // The counting endpoint refuses file sources and caps request size, so
    // the pre-flight re-counts only text and adds the per-file measurements.
    expect(result.countBlocks.every((b) => b.type === "text")).toBe(true);
    expect(result.attachmentTokens).toBe(Buffer.from("%PDF").toString("base64").length);
    expect(result.blocks.find((b) => b.type === "document")).toMatchObject({ source: { type: "file" } });
  });

  it("leaves the code execution tool off when everything fits in the prompt", async () => {
    const linear = fakeLinear(
      tracker([{ id: "a", title: "Notes", url: `${UPLOAD}a` }], { [`${UPLOAD}a`]: file("text/plain", "hello") }),
    );
    const result = await createAttachmentPreloader(linear, CONFIG).preload(
      recordingAnthropic(),
      SCOPE,
      "model",
      silentLogger,
    );
    expect(result.needsCodeExecution).toBe(false);
  });

  it("sends a text file over the per-file limit to the sandbox, and says why", async () => {
    const linear = fakeLinear(
      tracker([{ id: "a", title: "Canvas", url: `${UPLOAD}a` }], {
        [`${UPLOAD}a`]: file("text/html", "x".repeat(500)),
      }),
    );
    const anthropic = recordingAnthropic();
    const result = await createAttachmentPreloader(linear, CONFIG).preload(anthropic, SCOPE, "model", silentLogger);
    expect(result.blocks.map((b) => b.type)).toEqual(["container_upload", "text"]);
    expect(anthropic.uploads[0]?.type).toBe("text/html");
    expect(manifestOf(result.blocks as { type: string; text?: string }[])).toMatch(/per-file limit/);
  });

  it("uploads one file attached in two places once", async () => {
    const linear = fakeLinear(
      tracker(
        [
          { id: "a", title: "Brand guide", url: `${UPLOAD}a` },
          { id: "b", title: "Brand guide (copy)", url: `${UPLOAD}b` },
        ],
        { [`${UPLOAD}a`]: file("application/pdf", "same"), [`${UPLOAD}b`]: file("application/pdf", "same") },
      ),
    );
    const anthropic = recordingAnthropic();
    const result = await createAttachmentPreloader(linear, CONFIG).preload(anthropic, SCOPE, "model", silentLogger);
    expect(anthropic.uploads).toHaveLength(1);
    expect(manifestOf(result.blocks as { type: string; text?: string }[])).toMatch(/the same file as attachment 1/);
  });

  it("reuses an earlier activation's upload while it has life left, and re-uploads after", async () => {
    const linear = fakeLinear(
      tracker([{ id: "a", title: "Screens", url: `${UPLOAD}a` }], { [`${UPLOAD}a`]: file("application/pdf", "%PDF") }),
    );
    let clock = 0;
    const preloader = createAttachmentPreloader(linear, CONFIG, () => clock);
    const anthropic = recordingAnthropic();

    await preloader.preload(anthropic, SCOPE, "model", silentLogger);
    clock = 10 * 60 * 60 * 1000; // 14h of the 24h left — reused
    await preloader.preload(anthropic, SCOPE, "model", silentLogger);
    expect(anthropic.uploads).toHaveLength(1);

    clock = 20 * 60 * 60 * 1000; // 4h left, under the 6h margin — re-uploaded
    await preloader.preload(anthropic, SCOPE, "model", silentLogger);
    expect(anthropic.uploads).toHaveLength(2);
  });

  it("lists a file that failed to download as not loaded instead of failing the run", async () => {
    const linear = fakeLinear(
      tracker([{ id: "a", title: "Screens", url: `${UPLOAD}a` }], {
        [`${UPLOAD}a`]: new Error("download failed: HTTP 500"),
      }),
    );
    const result = await createAttachmentPreloader(linear, CONFIG).preload(
      recordingAnthropic(),
      SCOPE,
      "model",
      silentLogger,
    );
    expect(result.blocks.map((b) => b.type)).toEqual(["text"]);
    expect(manifestOf(result.blocks as { type: string; text?: string }[])).toMatch(
      /"Screens" \(on PROJ-1\) — NOT LOADED: download failed: HTTP 500/,
    );
  });

  it("puts a cache breakpoint on the manifest", async () => {
    const linear = fakeLinear(tracker([], {}));
    const result = await createAttachmentPreloader(linear, CONFIG).preload(
      recordingAnthropic(),
      SCOPE,
      "model",
      silentLogger,
    );
    expect(result.blocks.at(-1)).toMatchObject({ type: "text", cache_control: { type: "ephemeral" } });
  });

  it("lists a file over the per-file download cap as not loaded, suggesting a smaller export", async () => {
    const linear = fakeLinear(
      tracker([{ id: "a", title: "Recording", url: `${UPLOAD}a` }], {
        [`${UPLOAD}a`]: file("video/mp4", Buffer.alloc(1_001)),
      }),
    );
    const result = await createAttachmentPreloader(linear, CONFIG).preload(
      recordingAnthropic(),
      SCOPE,
      "model",
      silentLogger,
    );
    expect(manifestOf(result.blocks as { type: string; text?: string }[])).toMatch(
      /"Recording" \(on PROJ-1\) — NOT LOADED: too large to load .*smaller export/,
    );
  });

  it("stops downloading once an activation's total download cap is reached", async () => {
    const linear = fakeLinear(
      tracker(
        [
          { id: "a", title: "First", url: `${UPLOAD}a` },
          { id: "b", title: "Second", url: `${UPLOAD}b` },
        ],
        {
          [`${UPLOAD}a`]: file("application/zip", Buffer.alloc(900)),
          [`${UPLOAD}b`]: file("application/zip", Buffer.alloc(900, 1)),
        },
      ),
    );
    const result = await createAttachmentPreloader(linear, CONFIG).preload(
      recordingAnthropic(),
      SCOPE,
      "model",
      silentLogger,
    );
    const manifest = manifestOf(result.blocks as { type: string; text?: string }[]);
    expect(manifest).toMatch(/"First" .*code execution sandbox/);
    expect(manifest).toMatch(/"Second" .*NOT LOADED: skipped: this activation's attachments already reached/);
  });

  it("sends a file the counting endpoint refuses to the sandbox instead of failing the run", async () => {
    const linear = fakeLinear(
      tracker([{ id: "a", title: "Huge scan", url: `${UPLOAD}a` }], {
        [`${UPLOAD}a`]: file("application/pdf", "x".repeat(600)),
      }),
    );
    const result = await createAttachmentPreloader(linear, CONFIG).preload(
      recordingAnthropic(100),
      SCOPE,
      "model",
      silentLogger,
    );
    expect(result.blocks.map((b) => b.type)).toEqual(["container_upload", "text"]);
    expect(manifestOf(result.blocks as { type: string; text?: string }[])).toMatch(
      /would not accept it in the message/,
    );
  });
});
