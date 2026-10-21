import { describe, it, expect } from "vitest";
import { labourBalance, labourExpenseDescription } from "@/lib/labour";

describe("labourBalance", () => {
  it("subtracts paid from owed", () => {
    expect(labourBalance(1000, 400)).toBe(600);
  });

  it("never goes negative", () => {
    expect(labourBalance(1000, 1200)).toBe(0);
  });

  it("handles Postgres numeric strings", () => {
    expect(labourBalance("1500.50", "500.25")).toBe(1000.25);
  });
});

describe("labourExpenseDescription", () => {
  it("combines worker and work description", () => {
    expect(
      labourExpenseDescription({
        worker_name: "Ramesh",
        work_description: "Fitted 12 windows",
      })
    ).toBe("Ramesh — Fitted 12 windows");
  });

  it("falls back to the worker name", () => {
    expect(
      labourExpenseDescription({
        worker_name: "Ramesh",
        work_description: null,
      })
    ).toBe("Ramesh");
  });
});
