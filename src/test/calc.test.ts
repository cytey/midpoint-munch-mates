import { describe, it, expect } from "vitest";
import { calculateMidpoint, getDistance } from "@/lib/onemap";

describe("calculateMidpoint", () => {
  it("returns Singapore center for empty list", () => {
    const m = calculateMidpoint([]);
    expect(m.lat).toBeCloseTo(1.3521);
    expect(m.lng).toBeCloseTo(103.8198);
  });

  it("returns the single location as-is", () => {
    const m = calculateMidpoint([{ lat: 1.3, lng: 103.8 }]);
    expect(m.lat).toBeCloseTo(1.3);
    expect(m.lng).toBeCloseTo(103.8);
  });

  it("averages two symmetric locations", () => {
    const m = calculateMidpoint([
      { lat: 1.30, lng: 103.80 },
      { lat: 1.40, lng: 103.90 },
    ]);
    expect(m.lat).toBeCloseTo(1.35, 3);
    expect(m.lng).toBeCloseTo(103.85, 3);
  });
});

describe("getDistance", () => {
  it("is zero for the same point", () => {
    expect(getDistance(1.35, 103.82, 1.35, 103.82)).toBeCloseTo(0);
  });

  it("measures a known Singapore distance roughly", () => {
    // Changi to Jurong East is roughly 28 km
    const d = getDistance(1.3644, 103.9915, 1.3329, 103.7436);
    expect(d).toBeGreaterThan(25);
    expect(d).toBeLessThan(32);
  });
});
