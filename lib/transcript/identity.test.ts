import { describe, expect, it } from "vitest";
import { livekitIdentityBelongsToUser } from "./identity";

const USER_A = "12345678-1111-4111-8111-111111111111";
const USER_B = "87654321-2222-4222-8222-222222222222";

describe("speaker identity authorization", () => {
  it("accepts the authenticated speaker's server-issued identity format", () => {
    expect(livekitIdentityBelongsToUser("u_12345678_abcDE12", USER_A)).toBe(true);
  });

  it("prevents participant A from submitting participant B's identity", () => {
    expect(livekitIdentityBelongsToUser("u_87654321_abcDE12", USER_A)).toBe(false);
    expect(livekitIdentityBelongsToUser("u_87654321_abcDE12", USER_B)).toBe(true);
  });
});
