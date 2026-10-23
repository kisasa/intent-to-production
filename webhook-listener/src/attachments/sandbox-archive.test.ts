import { describe, expect, it } from "vitest";
import { archiveMemberNames, tarArchive } from "./sandbox-archive.js";

// Reads an archive back the way tar does: header, content, padding, and two
// empty blocks at the end.
function readTar(archive: Buffer): { name: string; bytes: Buffer }[] {
  const files: { name: string; bytes: Buffer }[] = [];
  let offset = 0;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;
    const stored = parseInt(header.toString("ascii", 148, 154), 8);
    const blank = Buffer.from(header);
    blank.write("        ", 148, "ascii");
    expect(blank.reduce((sum, b) => sum + b, 0)).toBe(stored);
    expect(header.toString("ascii", 257, 262)).toBe("ustar");
    const name = header.toString("utf8", 0, 100).replace(/\0.*$/s, "");
    const size = parseInt(header.toString("ascii", 124, 135), 8);
    files.push({ name: name, bytes: archive.subarray(offset + 512, offset + 512 + size) });
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  expect(archive.length % 512).toBe(0);
  return files;
}

describe("tarArchive", () => {
  it("packs every file whole, in order, past the API's sixteen", () => {
    const files = Array.from({ length: 24 }, (_, i) => ({
      name: `capture-${i}.jpg`,
      bytes: Buffer.alloc(700 + i, i),
    }));
    const read = readTar(tarArchive(files));
    expect(read.map((f) => f.name)).toEqual(files.map((f) => f.name));
    read.forEach((f, i) => expect(f.bytes.equals(files[i]?.bytes as Buffer)).toBe(true));
  });

  it("makes the same archive from the same files", () => {
    const files = [{ name: "a.pdf", bytes: Buffer.from("pdf") }];
    expect(tarArchive(files).equals(tarArchive(files))).toBe(true);
  });
});

describe("archiveMemberNames", () => {
  it("keeps names unique, ignoring case", () => {
    expect(archiveMemberNames(["Spec.docx", "spec.docx", "Spec.docx"])).toEqual([
      "Spec.docx",
      "spec (2).docx",
      "Spec (3).docx",
    ]);
  });

  it("shortens a long name to the header's 100 bytes, keeping its extension", () => {
    const [name] = archiveMemberNames([`${"VT Payment Processing review — 19 Oct ".repeat(4)}.md`]);
    expect(Buffer.byteLength(name as string, "utf8")).toBeLessThanOrEqual(100);
    expect(name?.endsWith(".md")).toBe(true);
  });
});
