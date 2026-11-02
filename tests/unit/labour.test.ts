import { describe, it, expect } from "vitest";
import {
  labourNet,
  labourExpenseDescription,
  labourRunningBalances,
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

describe("labourRunningBalances", () => {
  it("carries each worker's balance forward across entries", () => {
    const balances = labourRunningBalances(
      [
        {
          id: "a",
          worker_id: "w1",
          worker_name: "Ramesh",
          entry_date: "2026-01-01",
          amount_owed: 1000,
          amount_paid: 0,
        },
        {
          id: "b",
          worker_id: "w1",
          worker_name: "Ramesh",
          entry_date: "2026-01-02",
          amount_owed: 0,
          amount_paid: 1500,
        },
      ],
      new Map([["w1", 200]])
    );

    expect(balances.get("a")).toBe(1200);
    expect(balances.get("b")).toBe(-300);
  });

  it("keeps different workers separate", () => {
    const balances = labourRunningBalances([
      {
        id: "a",
        worker_id: "w1",
        worker_name: "Ramesh",
        entry_date: "2026-01-01",
        amount_owed: 1000,
        amount_paid: 0,
      },
      {
        id: "b",
        worker_id: "w2",
        worker_name: "Suresh",
        entry_date: "2026-01-02",
        amount_owed: 500,
        amount_paid: 0,
      },
    ]);

    expect(balances.get("a")).toBe(1000);
    expect(balances.get("b")).toBe(500);
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

  it("labels a payment-only entry as an advance", () => {
    const result = workerLedgerRows(0, [
      {
        ...row,
        work_description: null,
        amount_owed: "0.00",
        amount_paid: "500.00",
      },
    ]);
    expect(result.entries[1].description).toBe("Advance via cash");
    expect(result.balanceOwed).toBe(-500);
  });
});
