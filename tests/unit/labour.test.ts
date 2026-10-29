import { describe, it, expect } from "vitest";
import {
  labourNet,
  labourExpenseDescription,
  workerLedgerRows,
} from "@/lib/labour";

describe("labourNet", () => {
  it("subtracts paid from owed", () => {
    expect(labourNet(1000, 400)).toBe(600);
  });

  it("returns a negative balance for an overpayment", () => {
    expect(labourNet(1000, 1200)).toBe(-200);
  });

  it("handles Postgres numeric strings", () => {
    expect(labourNet("1500.50", "500.25")).toBe(1000.25);
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

describe("workerLedgerRows", () => {
  const row = {
    entry_date: "2026-01-05",
    work_description: "Fitted 12 windows",
    amount_owed: "1000.00",
    amount_paid: "400.00",
    payment_mode: "cash",
    reference_number: null,
  };

  it("tracks a running balance from opening balance", () => {
    const result = workerLedgerRows(500, [row]);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].description).toBe("Opening Balance");
    expect(result.totalOwed).toBe(1000);
    expect(result.totalPaid).toBe(400);
    expect(result.balanceOwed).toBe(1100);
    expect(result.entries[1].balance).toBe(1100);
  });

  it("reports a negative balance as an advance", () => {
    const result = workerLedgerRows(0, [{ ...row, amount_paid: "1500.00" }]);
    expect(result.balanceOwed).toBe(-500);
  });
});
