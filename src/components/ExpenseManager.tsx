"use client";

import { toast } from "@/lib/toast";
import { useEffect, useMemo, useState } from "react";
import { PAYMENT_MODES } from "@/lib/paymentModes";
import { inr, formatDateShort } from "@/lib/format";

export const EXPENSE_CATEGORIES = [
  { value: "material", label: "Material Purchase" },
  { value: "labour", label: "Labour / Salary" },
  { value: "transport", label: "Transport" },
  { value: "rent_utilities", label: "Rent & Utilities" },
  { value: "office", label: "Office & Misc" },
  { value: "other", label: "Other" },
] as const;

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  description: string | null;
  amount: number;
  payment_mode: string;
  reference_number: string | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function categoryLabel(v: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

function modeLabel(v: string) {
  return PAYMENT_MODES.find((m) => m.value === v)?.label ?? v;
}

function emptyForm(): Omit<Expense, "id"> {
  return {
    expense_date: today(),
    category: "material",
    description: "",
    amount: 0,
    payment_mode: "cash",
    reference_number: "",
  };
}

export default function ExpenseManager() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load(targetMonth: string) {
    setLoading(true);
    try {
      // Only fetch the selected month's rows from the server
      const res = await fetch(
        `/api/expenses?from_date=${targetMonth}-01&to_date=${targetMonth}-31`,
      );
      const json = await res.json();
      setExpenses(json.expenses ?? []);
    } catch {
      setError("Could not load expenses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(month);
  }, [month]);

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.expense_date.startsWith(month)),
    [expenses, month],
  );

  const totals = useMemo(() => {
    let total = 0;
    let cash = 0;
    const byCategory: Record<string, number> = {};
    for (const e of monthExpenses) {
      total += Number(e.amount);
      if (e.payment_mode === "cash") cash += Number(e.amount);
      byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);
    }
    return {
      total,
      cash,
      digital: total - cash,
      byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
    };
  }, [monthExpenses]);

  function startEdit(e: Expense) {
    setEditingId(e.id);
    setShowForm(true);
    setForm({
      expense_date: e.expense_date,
      category: e.category,
      description: e.description ?? "",
      amount: Number(e.amount),
      payment_mode: e.payment_mode,
      reference_number: e.reference_number ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (saving) return;
    if (!(Number(form.amount) > 0)) {
      setError("Enter an amount greater than 0.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editingId ? `/api/expenses/${editingId}` : "/api/expenses";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save expense.");
      toast.success(editingId ? "Expense updated." : "Expense added.");
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      await load(month);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save expense.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete.");
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success("Expense deleted.");
    } catch {
      toast.error("Could not delete the expense.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Month filter + add */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          Month
          <input type="month" className="input !w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm(emptyForm());
          }}
          className="btn-primary"
        >
          <span className="text-lg leading-none">+</span> Add expense
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total spent</p>
          <p className="text-xl font-bold font-mono mt-1">{inr(totals.total)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Paid in cash</p>
          <p className="text-xl font-bold font-mono mt-1">{inr(totals.cash)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Digital</p>
          <p className="text-xl font-bold font-mono mt-1">{inr(totals.digital)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Entries</p>
          <p className="text-xl font-bold font-mono mt-1">{monthExpenses.length}</p>
        </div>
      </div>

      {/* Add/edit form */}
      {showForm && (
        <div className="card p-5 space-y-4 border-brand-200">
          <h2 className="font-display font-bold text-ink">
            {editingId ? "Edit expense" : "New expense"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                className="input"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Amount (₹) *</label>
              <input
                type="number"
                min="0"
                step="any"
                className="input font-mono"
                value={form.amount || ""}
                placeholder="0"
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Paid via</label>
              <select
                className="input"
                value={form.payment_mode}
                onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <input
                className="input"
                placeholder="e.g. 20 sheets 5mm glass from Gujarat Guardian"
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            {(form.payment_mode === "bank_transfer" || form.payment_mode === "cheque") && (
              <div className="sm:col-span-2">
                <label className="label">
                  Reference number{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  className="input"
                  value={form.reference_number ?? ""}
                  onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                  placeholder="Cheque no, UTR, ref (optional)"
                />
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editingId ? "Save changes" : "Add expense"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setError("");
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <p className="text-sm text-slate-400 p-6 text-center font-body">Loading…</p>
        ) : monthExpenses.length === 0 ? (
          <p className="text-sm text-slate-400 p-10 text-center font-body">
            No expenses recorded for {month}. Track shop purchases, labour and bills here.
          </p>
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {monthExpenses.map((e) => (
                <div key={e.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm text-ink">{categoryLabel(e.category)}</p>
                      <p className="text-xs text-slate-400">{formatDateShort(e.expense_date)} · {modeLabel(e.payment_mode)}</p>
                      {e.description && <p className="text-sm text-slate-500 font-body mt-1">{e.description}</p>}
                    </div>
                    <p className="font-mono font-bold whitespace-nowrap">{inr(Number(e.amount), 2)}</p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => startEdit(e)} className="text-brand-600 hover:underline font-semibold">Edit</button>
                    <button onClick={() => remove(e.id)} className="text-red-500 hover:underline font-semibold">Delete</button>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop */}
            <table className="hidden md:table w-full text-sm font-body">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 border-b border-slate-100">
                  <th className="p-4">Date</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Mode</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {monthExpenses.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0">
                    <td className="p-4 whitespace-nowrap text-slate-500">{formatDateShort(e.expense_date)}</td>
                    <td className="p-4 font-medium text-ink">{categoryLabel(e.category)}</td>
                    <td className="p-4 text-slate-500 max-w-xs truncate">{e.description || "—"}</td>
                    <td className="p-4 text-slate-500">{modeLabel(e.payment_mode)}</td>
                    <td className="p-4 text-right font-mono font-semibold">{inr(Number(e.amount), 2)}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button onClick={() => startEdit(e)} className="text-brand-600 hover:underline text-xs font-semibold mr-3">Edit</button>
                      <button onClick={() => remove(e.id)} className="text-red-500 hover:underline text-xs font-semibold">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Category breakdown */}
      {totals.byCategory.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-bold text-ink mb-3">Where the money went</h2>
          <div className="space-y-2">
            {totals.byCategory.map(([cat, amt]) => {
              const pct = totals.total > 0 ? Math.round((amt / totals.total) * 100) : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-ink">{categoryLabel(cat)}</span>
                    <span className="font-mono text-slate-600">{inr(amt)} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
