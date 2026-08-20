import { describe, expect, it } from "vitest";
import { parseParticipantAttributes } from "./types";

describe("parseParticipantAttributes", () => {
  it("extracts trusted application attributes", () => {
    expect(
      parseParticipantAttributes({
        userId: "user-id",
        meetingId: "meeting-id",
        role: "host",
        ignored: "value",
      }),
    ).toEqual({
      userId: "user-id",
      meetingId: "meeting-id",
      role: "host",
    });
  });

  it("does not accept an unknown role", () => {
    expect(parseParticipantAttributes({ role: "admin" })).toEqual({
      userId: undefined,
      meetingId: undefined,
      role: undefined,
    });
  });

  it("handles missing attributes", () => {
    expect(parseParticipantAttributes(undefined)).toEqual({});
  });
});
