import { describe, expect, it } from "vitest";
import { createMeetingSchema, transcriptSegmentSchema } from "./index";

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

describe("transcriptSegmentSchema", () => {
  const segment = {
    meetingId: "12345678-1111-4111-8111-111111111111",
    livekitIdentity: "u_12345678_abcdefg",
    text: "We should deploy Friday.",
    startedAt: "2026-08-20T10:32:14.000Z",
    endedAt: "2026-08-20T10:32:18.000Z",
  };

  it("accepts one finalized speech segment", () => {
    expect(transcriptSegmentSchema.safeParse(segment).success).toBe(true);
  });

  it("rejects empty transcript text", () => {
    expect(transcriptSegmentSchema.safeParse({ ...segment, text: " " }).success).toBe(false);
  });
});
