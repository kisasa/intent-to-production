import { describe, it, expect } from "vitest";
import { extractLinkedRefs } from "./evidence-links.js";

describe("extractLinkedRefs", () => {
  it("finds issue URLs, including angle-bracketed markdown links", () => {
    const md =
      "Evidence issue: [PROJ-1](<https://linear.app/example-org/issue/PROJ-1>) and " +
      "https://linear.app/example-org/issue/PROJ-22/some-slug";
    expect(extractLinkedRefs(md).issues).toEqual(["PROJ-1", "PROJ-22"]);
  });

  it("finds issue mention tags by UUID", () => {
    const md =
      'Shared evidence is on <issue id="00000000-0000-4000-8000-000000000002" ' +
      'href="https://linear.app/example-org/issue/PROJ-9">PROJ-9</issue>.';
    // The tag's href is also a URL, so both forms of the one issue come back;
    // the walker dedupes on the UUID the lookup returns.
    expect(extractLinkedRefs(md).issues).toEqual(["PROJ-9", "00000000-0000-4000-8000-000000000002"]);
  });

  it("finds document URLs by their slug id", () => {
    const md = "[Business requirements](<https://linear.app/example-org/document/business-requirements-abcdef012345>)";
    expect(extractLinkedRefs(md).documents).toEqual(["abcdef012345"]);
  });

  it("does not follow bare identifiers in prose", () => {
    const md = "Requirement 7 governs; see clause 8.3.9 and PROJ-42 for background.";
    expect(extractLinkedRefs(md)).toEqual({ issues: [], documents: [] });
  });

  it("returns each reference once", () => {
    const md = "https://linear.app/example-org/issue/PROJ-1 again https://linear.app/example-org/issue/PROJ-1";
    expect(extractLinkedRefs(md).issues).toEqual(["PROJ-1"]);
  });
});
