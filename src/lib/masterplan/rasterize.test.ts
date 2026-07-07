import { describe, it, expect } from "vitest";
import { scaleForMaxDimension, aspectRatioChanged } from "./rasterize.client";

describe("scaleForMaxDimension", () => {
  it("returns 1 when the image is already within the max dimension", () => {
    expect(scaleForMaxDimension(1000, 800, 4000)).toBe(1);
  });

  it("clamps the largest dimension to maxDim preserving aspect ratio (landscape)", () => {
    const factor = scaleForMaxDimension(8000, 4000, 4000);
    expect(factor).toBeCloseTo(0.5);
    const width = 8000 * factor;
    const height = 4000 * factor;
    expect(Math.max(width, height)).toBeCloseTo(4000);
    expect(width / height).toBeCloseTo(8000 / 4000);
  });

  it("clamps based on whichever dimension is largest (portrait)", () => {
    const factor = scaleForMaxDimension(3000, 6000, 4000);
    expect(Math.max(3000 * factor, 6000 * factor)).toBeCloseTo(4000);
  });

  it("returns 1 for invalid (zero) dimensions instead of dividing by zero", () => {
    expect(scaleForMaxDimension(0, 0, 4000)).toBe(1);
  });
});

describe("aspectRatioChanged", () => {
  it("is false when the aspect ratio is identical", () => {
    expect(aspectRatioChanged(1000, 500, 2000, 1000)).toBe(false);
  });

  it("is false within the default 0.02 tolerance", () => {
    // old AR = 2, new AR = 2.01 (~0.5% relative diff)
    expect(aspectRatioChanged(1000, 500, 2010, 1000)).toBe(false);
  });

  it("is true beyond the default tolerance", () => {
    // old AR = 2, new AR = 1.5 (25% relative diff)
    expect(aspectRatioChanged(1000, 500, 1500, 1000)).toBe(true);
  });

  it("respects a custom tolerance", () => {
    expect(aspectRatioChanged(1000, 500, 1050, 500, 0.1)).toBe(false);
    expect(aspectRatioChanged(1000, 500, 1050, 500, 0.01)).toBe(true);
  });

  it("returns false for invalid (zero) dimensions", () => {
    expect(aspectRatioChanged(0, 500, 1000, 500)).toBe(false);
  });
});
