/**
 * Decides how one downloaded attachment reaches Claude. The rule is to give
 * Claude what a person in a desktop session would get: a PDF it can read page
 * by page, an image it can see, text as text, and anything else as a file it
 * can open with code. Which of those a file is depends on its content type,
 * never on the attachment's title — a title is whatever a human typed.
 */

export type AttachmentKind = "pdf" | "image" | "text" | "sandbox";

// The image formats the Messages API accepts as an image block.
const NATIVE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

// Content types that are text in a binary-sounding wrapper. Sent as plain
// text, because a document block only accepts PDF or text/plain.
const TEXT_LIKE_TYPES = [
  "application/json",
  "application/ld+json",
  "application/xml",
  "application/yaml",
  "application/x-yaml",
  "application/javascript",
  "application/x-ndjson",
  "application/sql",
  "image/svg+xml",
];

// The API's own per-image ceiling is 10 MB *base64-encoded*; base64 inflates
// by 4/3, so the raw-byte ceiling is three quarters of that. An image over it
// still reaches Claude — in the sandbox, where it can be opened with Pillow.
export const MAX_NATIVE_IMAGE_BYTES = Math.floor((10 * 1024 * 1024 * 3) / 4);

export function normalizeMimeType(contentType: string): string {
  return (contentType.split(";")[0] ?? "").trim().toLowerCase();
}

export function classifyAttachment(contentType: string, byteLength: number): AttachmentKind {
  const mime = normalizeMimeType(contentType);
  if (mime === "application/pdf") return "pdf";
  if (NATIVE_IMAGE_TYPES.includes(mime)) return byteLength <= MAX_NATIVE_IMAGE_BYTES ? "image" : "sandbox";
  if (mime.startsWith("text/") || TEXT_LIKE_TYPES.includes(mime)) return "text";
  return "sandbox";
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "text/html": ".html",
  "text/markdown": ".md",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/json": ".json",
  "application/xml": ".xml",
  "application/zip": ".zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/msword": ".doc",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.ms-powerpoint": ".ppt",
};

// The Files API rejects these in a filename, and the sandbox exposes a file
// under its uploaded name, so the name has to survive both.
const FORBIDDEN_FILENAME_CHARS = /[<>:"|?*\\/\u0000-\u001f]/g;

/**
 * The name a file is uploaded under — and therefore the name Claude finds it
 * by in the sandbox. Prefers the filename the download itself declared;
 * failing that, builds one from the attachment title and the content type.
 */
export function deriveFilename(title: string, contentType: string, contentDisposition: string | null): string {
  const declared = contentDisposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1];
  const base = declared ? decodeURIComponent(declared) : title;
  let name = base.replace(FORBIDDEN_FILENAME_CHARS, "_").replace(/\s+/g, " ").trim();
  if (name.length === 0) name = "attachment";
  const extension = EXTENSION_BY_MIME[normalizeMimeType(contentType)];
  if (extension && !name.toLowerCase().endsWith(extension)) name = `${name}${extension}`;
  return name.length > 255 ? name.slice(name.length - 255) : name;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Reads an image's pixel size from its header, for the four formats the API
 * takes as images. Null when the header can't be read; the caller treats an
 * unknown size as too large for a many-image request.
 */
export function imageDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length >= 24 && bytes.readUInt32BE(0) === 0x89504e47) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length >= 10 && bytes.toString("ascii", 0, 3) === "GIF") {
    return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  }
  if (bytes.length >= 30 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    const chunk = bytes.toString("ascii", 12, 16);
    if (chunk === "VP8 ") {
      return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === "VP8L") {
      const bits = bytes.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
    return null;
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = bytes[i + 1] as number;
      // Fill bytes, and markers that carry no length.
      if (marker === 0xff) {
        i++;
        continue;
      }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
        i += 2;
        continue;
      }
      // A start-of-frame marker holds the size; 0xC4, 0xC8 and 0xCC share the
      // range but are not frames.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: bytes.readUInt16BE(i + 7), height: bytes.readUInt16BE(i + 5) };
      }
      i += 2 + bytes.readUInt16BE(i + 2);
    }
    return null;
  }
  return null;
}
