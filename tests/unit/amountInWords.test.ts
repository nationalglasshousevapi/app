import { describe, it, expect } from "vitest";
import { amountInWords } from "@/lib/amountInWords";

describe("amountInWords", () => {
  it("handles zero", () => {
    expect(amountInWords(0)).toBe("Zero rupees only");
  });
  it("handles thousands", () => {
    expect(amountInWords(20000)).toBe("Twenty thousand rupees only");
  });
  it("handles lakhs with paise", () => {
    expect(amountInWords(150000.5)).toBe(
      "One lakh fifty thousand rupees and fifty paise only"
    );
  });
  it("handles hundreds", () => {
    expect(amountInWords(450)).toBe("Four hundred fifty rupees only");
  });
});
