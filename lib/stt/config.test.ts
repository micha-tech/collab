import { describe, expect, it } from "vitest";
import { modelForCapability, STT_MODELS } from "./config";

describe("STT model selection", () => {
  it("uses the preferred model on WebGPU", () => {
    expect(modelForCapability("webgpu")).toBe(STT_MODELS.default);
  });

  it("uses the lightweight model on WASM and disables unsupported devices", () => {
    expect(modelForCapability("wasm")).toBe(STT_MODELS.lightweight);
    expect(modelForCapability("unsupported")).toBeNull();
  });
});
