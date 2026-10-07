import { describe, it, expect } from "vitest";
import { classifyAttachment, deriveFilename, MAX_NATIVE_IMAGE_BYTES } from "./attachment-classifier.js";

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
