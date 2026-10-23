/**
 * Packs every file one activation sends to the code execution sandbox into a
 * single tar archive. The API refuses a request that adds more than 16 files
 * to the sandbox ("Cannot add more than 16 files to a session at once", seen
 * on 2026-10-23 with 24); one archive is one file however many it carries, and
 * Claude extracts it with code. Plain ustar with no compression: screenshots
 * and PDFs are compressed already.
 */

export const SANDBOX_ARCHIVE_NAME = "evidence.tar";

const BLOCK = 512;
const MAX_NAME_BYTES = 100;
// Fixed, so the same files always make the same archive and the upload cache
// can reuse it across an activation's passes.
const FIXED_MTIME = 1_767_225_600;

// Shortens the base, never the tail (a " (2)" suffix and the extension), until
// the whole name fits the header.
function fit(base: string, tail: string): string {
  let kept = base;
  while (kept.length > 0 && Buffer.byteLength(kept + tail, "utf8") > MAX_NAME_BYTES) kept = kept.slice(0, -1);
  return kept + tail;
}

/**
 * The name each file takes inside the archive, in order: at most 100 bytes,
 * the limit of a plain tar header, and unique ignoring case, since two
 * attachments can share a title.
 */
export function archiveMemberNames(filenames: string[]): string[] {
  const taken = new Set<string>();
  return filenames.map((filename) => {
    const extension = filename.match(/\.[A-Za-z0-9]{1,8}$/)?.[0] ?? "";
    const base = filename.slice(0, filename.length - extension.length);
    let name = fit(base, extension);
    for (let n = 2; taken.has(name.toLowerCase()); n++) name = fit(base, ` (${n})${extension}`);
    taken.add(name.toLowerCase());
    return name;
  });
}

function octal(value: number, width: number): string {
  return `${value.toString(8).padStart(width - 1, "0")}\0`;
}

export function tarArchive(files: { name: string; bytes: Buffer }[]): Buffer {
  const parts: Buffer[] = [];
  for (const file of files) {
    const header = Buffer.alloc(BLOCK);
    header.write(file.name, 0, MAX_NAME_BYTES, "utf8");
    header.write(octal(0o644, 8), 100, "ascii");
    header.write(octal(0, 8), 108, "ascii");
    header.write(octal(0, 8), 116, "ascii");
    header.write(octal(file.bytes.length, 12), 124, "ascii");
    header.write(octal(FIXED_MTIME, 12), 136, "ascii");
    header.write("        ", 148, "ascii");
    header.write("0", 156, "ascii");
    header.write("ustar\0", 257, "ascii");
    header.write("00", 263, "ascii");
    let sum = 0;
    for (const byte of header) sum += byte;
    header.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, "ascii");
    parts.push(header, file.bytes, Buffer.alloc((BLOCK - (file.bytes.length % BLOCK)) % BLOCK));
  }
  parts.push(Buffer.alloc(BLOCK * 2));
  return Buffer.concat(parts);
}
