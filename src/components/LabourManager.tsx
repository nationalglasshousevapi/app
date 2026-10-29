"use client";

import { toast } from "@/lib/toast";
import { useEffect, useMemo, useState } from "react";
import { PAYMENT_MODES } from "@/lib/paymentModes";
import { inr, formatDateShort } from "@/lib/format";
import { labourNet } from "@/lib/labour";

type LabourEntry = {
  id: string;
  entry_date: string;
  worker_name: string;
  work_description: string | null;
  amount_owed: number | string;
  amount_paid: number | string;
  payment_mode: string;
  reference_number: string | null;
  notes: string | null;
};

type Form = Omit<LabourEntry, "id">;

type WorkerSummary = {
  id: string;
  name: string;
  balance_owed: number;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function modeLabel(v: string) {
  return PAYMENT_MODES.find((m) => m.value === v)?.label ?? v;
}

function emptyForm(): Form {
  return {
    entry_date: today(),
    worker_name: "",
    work_description: "",
    amount_owed: 0,
    amount_paid: 0,
    payment_mode: "cash",
    reference_number: "",
    notes: "",
  };
}

export default function LabourManager() {
  const [entries, setEntries] = useState<LabourEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);

  async function load(targetMonth: string) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/labour?from_date=${targetMonth}-01&to_date=${targetMonth}-31`
      );
      const json = await res.json();
      setEntries(json.labour ?? []);
    } catch {
      setError("Could not load labour entries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(month);
  }, [month]);

  useEffect(() => {
    fetch("/api/workers")
      .then((r) => r.json())
      .then((json) =>
        setWorkers(
          (json.workers ?? []).map((w: any) => ({
            id: w.id,
            name: w.name,
            balance_owed: Number(w.balance_owed),
          }))
        )
      )
      .catch(() => {});
  }, []);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.entry_date.startsWith(month)),
    [entries, month]
  );

  const workerNames = workers.map((w) => w.name);
  const selectedWorker = workers.find((w) => w.name === form.worker_name);
  const formNet = labourNet(form.amount_owed, form.amount_paid);

  const totals = useMemo(() => {
    let owed = 0;
    let paid = 0;
    for (const e of monthEntries) {
      owed += Number(e.amount_owed);
      paid += Number(e.amount_paid);
    }
    return { owed, paid, net: labourNet(owed, paid) };
  }, [monthEntries]);

  function startEdit(e: LabourEntry) {
    setEditingId(e.id);
    setShowForm(true);
    setForm({
      entry_date: e.entry_date,
      worker_name: e.worker_name,
      work_description: e.work_description ?? "",
      amount_owed: Number(e.amount_owed),
      amount_paid: Number(e.amount_paid),
      payment_mode: e.payment_mode,
      reference_number: e.reference_number ?? "",
      notes: e.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (saving) return;
    if (!form.worker_name.trim()) {
      setError("Enter the worker's name.");
      return;
    }
    if (Number(form.amount_owed) <= 0 && Number(form.amount_paid) <= 0) {
      setError("Enter work done or a payment amount.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editingId ? `/api/labour/${editingId}` : "/api/labour";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount_owed: Number(form.amount_owed),
          amount_paid: Number(form.amount_paid),
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to save labour entry.");
      toast.success(
        editingId ? "Labour entry updated." : "Labour entry added."
      );
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      await load(month);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save labour entry."
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (
      !confirm(
        "Delete this labour entry? Its labour expense will be removed too."
      )
    )
      return;
    try {
      const res = await fetch(`/api/labour/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete.");
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Labour entry deleted.");
    } catch {
      toast.error("Could not delete the labour entry.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          Month
          <input
            type="month"
            className="input !w-auto"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm(emptyForm());
          }}
          className="btn-primary"
        >
          <span className="text-lg leading-none">+</span> Add labour entry
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Amount owed
          </p>
          <p className="text-xl font-bold font-mono mt-1">{inr(totals.owed)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Paid
          </p>
          <p className="text-xl font-bold font-mono mt-1">{inr(totals.paid)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Balance
          </p>
          <p
            className={`text-xl font-bold font-mono mt-1 ${
              totals.net > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {inr(Math.abs(totals.net))}
            <span className="ml-1 text-xs font-semibold">
              {totals.net > 0 ? "due" : totals.net < 0 ? "advance" : "settled"}
            </span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Entries
          </p>
          <p className="text-xl font-bold font-mono mt-1">
            {monthEntries.length}
          </p>
        </div>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4 border-brand-200">
          <h2 className="font-display font-bold text-ink">
            {editingId ? "Edit labour entry" : "New labour entry"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-lg">Date *</label>
              <input
                type="date"
                className="input"
                value={form.entry_date}
                onChange={(e) =>
                  setForm({ ...form, entry_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label-lg">Worker name *</label>
              <input
                className="input"
                placeholder="e.g. Ramesh"
                list="worker-names"
                value={form.worker_name}
                onChange={(e) =>
                  setForm({ ...form, worker_name: e.target.value })
                }
              />
              <datalist id="worker-names">
                {workerNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              {selectedWorker && (
                <p className="text-xs text-slate-500 mt-1">
                  Running balance:{" "}
                  <span
                    className={
                      selectedWorker.balance_owed > 0
                        ? "text-red-600 font-semibold"
                        : "text-green-600 font-semibold"
                    }
                  >
                    {selectedWorker.balance_owed >= 0
                      ? `${inr(selectedWorker.balance_owed)} owed`
                      : `${inr(Math.abs(selectedWorker.balance_owed))} advance`}
                  </span>
                </p>
              )}
            </div>
            <div>
              <label className="label-lg">Work amount (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="input font-mono"
                value={form.amount_owed || ""}
                placeholder="0"
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount_owed: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-slate-400 mt-1">
                Leave 0 to record an advance payment.
              </p>
            </div>
            <div>
              <label className="label-lg">Amount paid (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="input font-mono"
                value={form.amount_paid || ""}
                placeholder="0"
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount_paid: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-slate-400 mt-1">
                Can be more than the work amount for an advance.
              </p>
            </div>
            <div>
              <label className="label-lg">Paid via</label>
              <select
                className="input"
                value={form.payment_mode}
                onChange={(e) =>
                  setForm({ ...form, payment_mode: e.target.value })
                }
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Balance after this payment</label>
              <p
                className={`input bg-slate-50 font-mono flex items-center ${
                  formNet > 0
                    ? "text-red-600"
                    : formNet < 0
                      ? "text-green-600"
                      : ""
                }`}
              >
                {formNet > 0
                  ? `${inr(formNet, 2)} due`
                  : formNet < 0
                    ? `${inr(Math.abs(formNet), 2)} advance`
                    : "Settled"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Work performed</label>
              <input
                className="input"
                placeholder="e.g. Fitted 12 windows at Sharma Villa"
                value={form.work_description ?? ""}
                onChange={(e) =>
                  setForm({ ...form, work_description: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">
                Other details{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                className="input"
                placeholder="Notes, site, advance, deductions…"
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            {(form.payment_mode === "bank_transfer" ||
              form.payment_mode === "cheque") && (
              <div className="sm:col-span-2">
                <label className="label">
                  Reference number{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  className="input"
                  value={form.reference_number ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, reference_number: e.target.value })
                  }
                  placeholder="Cheque no, UTR, ref (optional)"
                />
              </div>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editingId ? "Save changes" : "Add entry"}
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

      <div className="card overflow-hidden">
        {loading ? (
          <p className="text-sm text-slate-400 p-6 text-center font-body">
            Loading…
          </p>
        ) : monthEntries.length === 0 ? (
          <p className="text-sm text-slate-400 p-10 text-center font-body">
            No labour entries for {month}. Record the work done, what you owe
            and what you paid.
          </p>
        ) : (
          <>
            <div className="xl:hidden divide-y divide-slate-100">
              {monthEntries.map((e) => {
                const net = labourNet(e.amount_owed, e.amount_paid);
                return (
                  <div key={e.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm text-ink">
                          {e.worker_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDateShort(e.entry_date)} ·{" "}
                          {modeLabel(e.payment_mode)}
                        </p>
                        {e.work_description && (
                          <p className="text-sm text-slate-500 font-body mt-1">
                            {e.work_description}
                          </p>
                        )}
                        {e.notes && (
                          <p className="text-xs text-slate-400 font-body mt-1">
                            {e.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="font-mono font-bold">
                          {inr(Number(e.amount_owed), 2)}
                        </p>
                        <p
                          className={`text-xs font-semibold ${
                            net > 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {net > 0
                            ? `${inr(net, 2)} due`
                            : net < 0
                              ? `${inr(Math.abs(net), 2)} advance`
                              : "Settled"}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      Paid {inr(Number(e.amount_paid), 2)}
                    </p>
                    <div className="flex gap-3 text-xs">
                      <button
                        onClick={() => startEdit(e)}
                        className="text-brand-600 hover:underline font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(e.id)}
                        className="text-red-500 hover:underline font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 border-b border-slate-100">
                    <th className="p-4">Date</th>
                    <th className="p-4">Worker</th>
                    <th className="p-4">Work</th>
                    <th className="p-4 text-right">Owed</th>
                    <th className="p-4 text-right">Paid</th>
                    <th className="p-4 text-right">Balance</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {monthEntries.map((e) => {
                    const net = labourNet(e.amount_owed, e.amount_paid);
                    return (
                      <tr
                        key={e.id}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="p-4 whitespace-nowrap text-slate-500">
                          {formatDateShort(e.entry_date)}
                        </td>
                        <td className="p-4 font-medium text-ink">
                          {e.worker_name}
                        </td>
                        <td className="p-4 text-slate-500 max-w-xs">
                          <p className="truncate">
                            {e.work_description || "—"}
                          </p>
                          {e.notes && (
                            <p className="text-xs text-slate-400 truncate">
                              {e.notes}
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-right font-mono">
                          {inr(Number(e.amount_owed), 2)}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-600">
                          {inr(Number(e.amount_paid), 2)}
                        </td>
                        <td
                          className={`p-4 text-right font-mono font-semibold ${
                            net > 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {net > 0
                            ? inr(net, 2)
                            : net < 0
                              ? `${inr(Math.abs(net), 2)} adv`
                              : "Settled"}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => startEdit(e)}
                            className="text-brand-600 hover:underline text-xs font-semibold mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(e.id)}
                            className="text-red-500 hover:underline text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
