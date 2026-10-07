import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { downloadEvidence, evidenceFilename, MANIFEST_FILENAME, type EvidenceDownloadConfig } from "./evidence-download.js";
import { fakeLinear, file, issue, silentLogger, type FakeTracker } from "./test-fakes.js";

const CONFIG: EvidenceDownloadConfig = { walk: { maxHops: 3, maxNodes: 40 }, maxFileBytes: 1_000, maxTotalBytes: 1_500 };
const UPLOAD = "https://uploads.linear.app/";

function epicWith(attachments: { id: string; title: string; url: string }[], files: FakeTracker["files"]): FakeTracker {
  return { issues: { "PROJ-10": issue("PROJ-10", "", attachments) }, files: files };
}

let dir: string;
beforeEach(async () => {
  dir = join(await mkdtemp(join(tmpdir(), "evidence-")), "evidence");
});
afterEach(async () => {
  await rm(join(dir, ".."), { recursive: true, force: true });
});

describe("downloadEvidence", () => {
  it("saves each file under a numbered name and lists it in the manifest", async () => {
    const linear = fakeLinear(
      epicWith(
        [
          { id: "a", title: "Screens", url: `${UPLOAD}a` },
          { id: "b", title: "Pull request", url: "https://github.com/example-org/example-web/pull/1" },
        ],
        { [`${UPLOAD}a`]: file("application/pdf", "%PDF tiny") },
      ),
    );
    const manifestPath = await downloadEvidence(linear, "PROJ-10", dir, CONFIG, silentLogger);

    expect((await readdir(dir)).sort()).toEqual(["01-Screens.pdf", MANIFEST_FILENAME]);
    expect(await readFile(join(dir, "01-Screens.pdf"), "utf8")).toBe("%PDF tiny");
    const manifest = await readFile(manifestPath, "utf8");
    expect(manifest).toContain('1. "Screens" (on PROJ-10) — `01-Screens.pdf`');
    expect(manifest).toMatch(/2\. "Pull request" \(on PROJ-10\) — a link, not a file/);
    expect(manifest).toMatch(/Never fetch an attachment through the tracker connector/);
  });

  it("saves one file attached in two places once", async () => {
    const linear = fakeLinear(
      epicWith(
        [
          { id: "a", title: "Brand guide", url: `${UPLOAD}a` },
          { id: "b", title: "Brand guide (copy)", url: `${UPLOAD}b` },
        ],
        { [`${UPLOAD}a`]: file("application/pdf", "same"), [`${UPLOAD}b`]: file("application/pdf", "same") },
      ),
    );
    const manifestPath = await downloadEvidence(linear, "PROJ-10", dir, CONFIG, silentLogger);
    expect(await readdir(dir)).toHaveLength(2);
    expect(await readFile(manifestPath, "utf8")).toMatch(/the same file as `01-Brand guide.pdf`/);
  });

  it("lists files over the per-file and total caps as not downloaded", async () => {
    const linear = fakeLinear(
      epicWith(
        [
          { id: "a", title: "Recording", url: `${UPLOAD}a` },
          { id: "b", title: "Archive", url: `${UPLOAD}b` },
          { id: "c", title: "Second archive", url: `${UPLOAD}c` },
        ],
        {
          [`${UPLOAD}a`]: file("video/mp4", Buffer.alloc(1_001)),
          [`${UPLOAD}b`]: file("application/zip", Buffer.alloc(900)),
          [`${UPLOAD}c`]: file("application/zip", Buffer.alloc(900, 1)),
        },
      ),
    );
    const manifest = await readFile(await downloadEvidence(linear, "PROJ-10", dir, CONFIG, silentLogger), "utf8");
    expect(manifest).toMatch(/"Recording" .*NOT DOWNLOADED: too large .*smaller export/);
    expect(manifest).toMatch(/"Archive" .*`02-Archive.zip`/);
    expect(manifest).toMatch(/"Second archive" .*NOT DOWNLOADED: skipped: the evidence already reached/);
  });

  it("records a failed walk in the manifest instead of failing the run", async () => {
    const manifestPath = await downloadEvidence(fakeLinear({}), "PROJ-10", dir, CONFIG, silentLogger);
    expect(await readFile(manifestPath, "utf8")).toMatch(/could not be collected before your run/);
  });
});

describe("evidenceFilename", () => {
  it("numbers the file and gives it an extension its content type implies", () => {
    expect(evidenceFilename(3, "Sign-in: screen", "image/png", null)).toBe("03-Sign-in_ screen.png");
  });

  it("prefers the filename the download declared", () => {
    expect(evidenceFilename(1, "Title", "application/pdf", 'attachment; filename="screens.pdf"')).toBe("01-screens.pdf");
  });
});
