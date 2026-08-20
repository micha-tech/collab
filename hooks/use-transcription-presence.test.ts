import { describe, expect, it } from "vitest";
import { parseTranscriptionPresence } from "./use-transcription-presence";

const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

describe("transcription presence protocol", () => {
  it("accepts a fully typed presence announcement", () => {
    expect(parseTranscriptionPresence(encode({
      version: 1,
      active: true,
      identity: "u_12345678_abcdefg",
      name: "Daniel",
      sentAt: 1_777_000_000_000,
    }))).toMatchObject({ active: true, name: "Daniel" });
  });

  it("rejects malformed or incompatible announcements", () => {
    expect(parseTranscriptionPresence(encode({ version: 2, active: true }))).toBeNull();
    expect(parseTranscriptionPresence(new Uint8Array([255]))).toBeNull();
  });
});
