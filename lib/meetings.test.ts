import { describe, expect, it } from "vitest";
import { canJoinMeeting } from "./meetings";

describe("canJoinMeeting", () => {
  it("always allows the host", () => {
    expect(
      canJoinMeeting({ isHost: true, isAnonymous: true, allowGuests: false }),
    ).toBe(true);
  });

  it("allows signed-in participants when anonymous guests are disabled", () => {
    expect(
      canJoinMeeting({ isHost: false, isAnonymous: false, allowGuests: false }),
    ).toBe(true);
  });

  it("rejects anonymous participants when guests are disabled", () => {
    expect(
      canJoinMeeting({ isHost: false, isAnonymous: true, allowGuests: false }),
    ).toBe(false);
  });

  it("allows anonymous participants when guests are enabled", () => {
    expect(
      canJoinMeeting({ isHost: false, isAnonymous: true, allowGuests: true }),
    ).toBe(true);
  });
});
