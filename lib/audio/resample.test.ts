import { describe, expect, it } from "vitest";
import { resampleMono } from "./resample";

describe("resampleMono", () => {
  it("downsamples microphone PCM to Whisper's 16 kHz input", () => {
    const input = new Float32Array(48_000).fill(0.25);
    const result = resampleMono(input, 48_000);
    expect(result).toHaveLength(16_000);
    expect(result[8_000]).toBeCloseTo(0.25);
  });

  it("avoids copying audio already at 16 kHz", () => {
    const input = new Float32Array([0, 0.5, -0.5]);
    expect(resampleMono(input, 16_000)).toBe(input);
  });
});
