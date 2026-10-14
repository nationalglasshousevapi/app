import { describe, it, expect } from "vitest";
import { moveActive } from "@/lib/comboboxNav";

describe("moveActive", () => {
  it("returns -1 when empty", () => {
    expect(moveActive(-1, 1, 0)).toBe(-1);
  });
  it("starts at ends when nothing active", () => {
    expect(moveActive(-1, 1, 3)).toBe(0);
    expect(moveActive(-1, -1, 3)).toBe(2);
  });
  it("wraps around", () => {
    expect(moveActive(2, 1, 3)).toBe(0);
    expect(moveActive(0, -1, 3)).toBe(2);
  });
});
