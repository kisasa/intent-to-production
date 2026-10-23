import { describe, it, expect } from "vitest";
import { classifyAttachment, deriveFilename, imageDimensions, MAX_NATIVE_IMAGE_BYTES } from "./attachment-classifier.js";

describe("classifyAttachment", () => {
  it("sends a PDF as a PDF", () => {
    expect(classifyAttachment("application/pdf", 1_000_000)).toBe("pdf");
  });

  it("sends the four API image formats as images", () => {
    for (const mime of ["image/png", "image/jpeg", "image/gif", "image/webp"]) {
      expect(classifyAttachment(mime, 50_000)).toBe("image");
    }
  });

  it("sends an image over the API's size ceiling to the sandbox", () => {
    expect(classifyAttachment("image/png", MAX_NATIVE_IMAGE_BYTES + 1)).toBe("sandbox");
  });

  it("sends text-like types as text, ignoring charset parameters", () => {
    expect(classifyAttachment("text/html; charset=utf-8", 75_000)).toBe("text");
    expect(classifyAttachment("application/json", 10)).toBe("text");
    expect(classifyAttachment("image/svg+xml", 10)).toBe("text");
  });

  it("sends office documents, archives and unknown types to the sandbox", () => {
    expect(
      classifyAttachment("application/vnd.openxmlformats-officedocument.wordprocessingml.document", 10),
    ).toBe("sandbox");
    expect(classifyAttachment("application/zip", 10)).toBe("sandbox");
    expect(classifyAttachment("application/octet-stream", 10)).toBe("sandbox");
    expect(classifyAttachment("image/heic", 10)).toBe("sandbox");
  });
});

describe("deriveFilename", () => {
  it("prefers the filename the download declared", () => {
    expect(deriveFilename("Some title", "application/pdf", 'attachment; filename="screens.pdf"')).toBe("screens.pdf");
  });

  it("builds a name from the title and content type when none is declared", () => {
    expect(
      deriveFilename(
        "Quarterly figures",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        null,
      ),
    ).toBe("Quarterly figures.xlsx");
  });

  it("strips characters the Files API rejects, and gives the name a real extension", () => {
    expect(deriveFilename("Mockup: home page (index.html)", "text/html", null)).toBe(
      "Mockup_ home page (index.html).html",
    );
  });

  it("does not double an extension the title already carries", () => {
    expect(deriveFilename("brand-guide.pdf", "application/pdf", null)).toBe("brand-guide.pdf");
  });
});

describe("imageDimensions", () => {
  it("reads a PNG's size from its header", () => {
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
    png.writeUInt32BE(13, 8);
    png.write("IHDR", 12, "ascii");
    png.writeUInt32BE(1358, 16);
    png.writeUInt32BE(896, 20);
    expect(imageDimensions(png)).toEqual({ width: 1358, height: 896 });
  });

  it("reads a JPEG's size from its start-of-frame marker, past other segments", () => {
    const app0 = Buffer.concat([Buffer.from([0xff, 0xe0, 0x00, 0x10]), Buffer.alloc(14)]);
    const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x03, 0x80, 0x05, 0x4e, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof]);
    expect(imageDimensions(jpeg)).toEqual({ width: 1358, height: 896 });
  });

  it("reads a GIF's size", () => {
    const gif = Buffer.alloc(10);
    gif.write("GIF89a", 0, "ascii");
    gif.writeUInt16LE(640, 6);
    gif.writeUInt16LE(480, 8);
    expect(imageDimensions(gif)).toEqual({ width: 640, height: 480 });
  });

  it("reads an extended WebP's size", () => {
    const webp = Buffer.alloc(30);
    webp.write("RIFF", 0, "ascii");
    webp.write("WEBP", 8, "ascii");
    webp.write("VP8X", 12, "ascii");
    webp.writeUIntLE(2559, 24, 3);
    webp.writeUIntLE(1439, 27, 3);
    expect(imageDimensions(webp)).toEqual({ width: 2560, height: 1440 });
  });

  it("returns null for bytes it does not recognize", () => {
    expect(imageDimensions(Buffer.from("not an image at all"))).toBeNull();
  });
});
