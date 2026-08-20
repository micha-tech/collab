import { describe, expect, it } from "vitest";
import { createMeetingSchema } from "./index";

describe("createMeetingSchema", () => {
  it("allows guests by default for existing clients", () => {
    expect(createMeetingSchema.parse({ title: "Weekly review" })).toEqual({
      title: "Weekly review",
      allowGuests: true,
    });
  });

  it("preserves an explicit private meeting choice", () => {
    expect(
      createMeetingSchema.parse({ title: "Leadership sync", allowGuests: false }),
    ).toEqual({ title: "Leadership sync", allowGuests: false });
  });

  it("rejects non-boolean guest settings", () => {
    expect(() =>
      createMeetingSchema.parse({ title: "Review", allowGuests: "yes" }),
    ).toThrow();
  });
});
