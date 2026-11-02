"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { PAYMENT_MODES } from "@/lib/paymentModes";
import { inr, formatDateShort } from "@/lib/format";
import { labourNet, labourRunningBalances } from "@/lib/labour";

type LabourEntry = {
  id: string;
  worker_id?: string | null;
  entry_date: string;
  worker_name: string;
  work_description: string | null;
  amount_owed: number | string;
  amount_paid: number | string;
  payment_mode: string;
  reference_number: string | null;
  notes: string | null;
  created_at?: string | null;
};

type Form = {
  entry_date: string;
  worker_name: string;
  work_description: string;
  amount_owed: number;
  amount_paid: number;
  payment_mode: string;
  reference_number: string;
  notes: string;
};

type WorkerSummary = {
  id: string;
  name: string;
  opening_balance: number;
  balance_owed: number;
};

type FormMode = "work" | "advance";

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

function balanceText(value: number) {
  if (value > 0) return `${inr(value, 2)} due`;
  if (value < 0) return `${inr(Math.abs(value), 2)} advance`;
  return "Settled";
}

function balanceClass(value: number) {
  if (value > 0) return "text-red-600";
  if (value < 0) return "text-green-600";
  return "text-slate-500";
}

export default function LabourManager() {
  const [entries, setEntries] = useState<LabourEntry[]>([]);
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [workerFilter, setWorkerFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("work");
  const [form, setForm] = useState<Form>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [labourRes, workersRes] = await Promise.all([
        fetch("/api/labour"),
        fetch("/api/workers"),
      ]);
      const labourJson = await labourRes.json();
      const workersJson = await workersRes.json();
      setEntries(labourJson.labour ?? []);
      setWorkers(
        (workersJson.workers ?? []).map((w: any) => ({
          id: w.id,
          name: w.name,
          opening_balance: Number(w.opening_balance),
          balance_owed: Number(w.balance_owed),
        }))
      );
    } catch {
      setError("Could not load labour entries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const openingByWorker = useMemo(() => {
    const map = new Map<string, number>();
    for (const worker of workers) {
      map.set(worker.id, worker.opening_balance);
    }
    return map;
  }, [workers]);

  const runningBalances = useMemo(
    () => labourRunningBalances(entries, openingByWorker),
    [entries, openingByWorker]
  );

  const visibleEntries = useMemo(() => {
    const filtered =
      workerFilter === "all"
        ? entries
        : entries.filter((entry) => entry.worker_id === workerFilter);
    return [...filtered].sort(
      (a, b) =>
        b.entry_date.localeCompare(a.entry_date) ||
        (b.created_at ?? "").localeCompare(a.created_at ?? "")
    );
  }, [entries, workerFilter]);

  const filteredWorker = workers.find((worker) => worker.id === workerFilter);
  const selectedWorker = workers.find(
    (worker) =>
      worker.name.trim().toLowerCase() === form.worker_name.trim().toLowerCase()
  );
  const editingEntry = editingId
    ? entries.find((entry) => entry.id === editingId)
    : null;
  const formNet = labourNet(form.amount_owed, form.amount_paid);
  const sameWorkerAsEditing =
    !editingEntry ||
    editingEntry.worker_name.trim().toLowerCase() ===
      form.worker_name.trim().toLowerCase();
  const baseBalance =
    (selectedWorker?.balance_owed ?? 0) -
    (editingEntry && sameWorkerAsEditing
      ? labourNet(editingEntry.amount_owed, editingEntry.amount_paid)
      : 0);
  const balanceAfter = baseBalance + formNet;
  const hasOpening =
    workerFilter === "all"
      ? workers.some((worker) => worker.opening_balance !== 0)
      : (filteredWorker?.opening_balance ?? 0) !== 0;

  const totals = useMemo(() => {
    let owed = 0;
    let paid = 0;
    for (const entry of visibleEntries) {
      owed += Number(entry.amount_owed);
      paid += Number(entry.amount_paid);
    }

    const unlinkedNet = entries
      .filter((entry) => !entry.worker_id)
      .reduce(
        (sum, entry) => sum + labourNet(entry.amount_owed, entry.amount_paid),
        0
      );
    const linkedNet = workers.reduce(
      (sum, worker) => sum + worker.balance_owed,
      0
    );
    const net =
      workerFilter === "all"
        ? linkedNet + unlinkedNet
        : (filteredWorker?.balance_owed ?? 0);

    return { owed, paid, net };
  }, [visibleEntries, entries, workers, workerFilter, filteredWorker]);

  function openForm(mode: FormMode) {
    setShowForm(true);
    setEditingId(null);
    setFormMode(mode);
    const next = emptyForm();
    if (filteredWorker) next.worker_name = filteredWorker.name;
    setForm(next);
    setError("");
  }

  function startEdit(entry: LabourEntry) {
    setEditingId(entry.id);
    setShowForm(true);
    setFormMode(Number(entry.amount_owed) > 0 ? "work" : "advance");
    setForm({
      entry_date: entry.entry_date,
      worker_name: entry.worker_name,
      work_description: entry.work_description ?? "",
      amount_owed: Number(entry.amount_owed),
      amount_paid: Number(entry.amount_paid),
      payment_mode: entry.payment_mode,
      reference_number: entry.reference_number ?? "",
      notes: entry.notes ?? "",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (saving) return;
    if (!form.worker_name.trim()) {
      setError("Enter the worker's name.");
      return;
    }
    const owed = formMode === "advance" ? 0 : Number(form.amount_owed);
    const paid = Number(form.amount_paid);
    if (owed <= 0 && paid <= 0) {
      setError(
        formMode === "advance"
          ? "Enter the advance amount."
          : "Enter work done or a payment amount."
      );
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
          amount_owed: owed,
          amount_paid: paid,
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to save labour entry.");
      toast.success(
        editingId
          ? "Labour entry updated."
          : owed <= 0
            ? "Advance recorded."
            : "Work recorded."
      );
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      await load();
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
      toast.success("Labour entry deleted.");
      await load();
    } catch {
      toast.error("Could not delete the labour entry.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-600">
            Worker
            <select
              className="input !w-auto min-w-[12rem]"
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
            >
              <option value="all">All workers</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </label>
          {filteredWorker && (
            <Link
              href={`/workers/${filteredWorker.id}`}
              className="btn-secondary text-sm"
            >
              Statement
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => openForm("advance")}
            className="btn-secondary w-full sm:w-auto"
          >
            Give advance
          </button>
          <button
            onClick={() => openForm("work")}
            className="btn-primary w-full sm:w-auto"
          >
            <span className="text-lg leading-none">+</span> Add work
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Work recorded
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
            Net balance
          </p>
          <p
            className={`text-xl font-bold font-mono mt-1 ${balanceClass(
              totals.net
            )}`}
          >
            {inr(Math.abs(totals.net))}
            <span className="ml-1 text-xs font-semibold">
              {totals.net > 0 ? "due" : totals.net < 0 ? "advance" : "settled"}
            </span>
          </p>
          {hasOpening && (
            <p className="text-[11px] text-slate-400 mt-1">
              Includes opening balance
            </p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Entries
          </p>
          <p className="text-xl font-bold font-mono mt-1">
            {visibleEntries.length}
          </p>
        </div>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4 border-brand-200">
          <div>
            <h2 className="font-display font-bold text-ink">
              {editingId
                ? "Edit labour entry"
                : formMode === "advance"
                  ? "Give advance"
                  : "Add work"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {formMode === "advance"
                ? "Record money paid ahead of work. It stays on the worker's running account."
                : "Record work as it happens. You can pay now or later."}
            </p>
          </div>
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
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.name} />
                ))}
              </datalist>
              {selectedWorker && (
                <p className="text-xs text-slate-500 mt-1">
                  Account now:{" "}
                  <span className={balanceClass(selectedWorker.balance_owed)}>
                    {balanceText(selectedWorker.balance_owed)}
                  </span>
                </p>
              )}
            </div>
            {formMode === "work" && (
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
              </div>
            )}
            <div>
              <label className="label-lg">
                {formMode === "advance"
                  ? "Advance amount (₹) *"
                  : "Paid now (₹)"}
              </label>
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
                {formMode === "advance"
                  ? "This is an advance against future work."
                  : "Leave 0 to pay later. Paying more than the work amount becomes an advance."}
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
              <label className="label">Balance after saving</label>
              <p
                className={`input bg-slate-50 font-mono flex items-center ${balanceClass(
                  balanceAfter
                )}`}
              >
                {balanceText(balanceAfter)}
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">
                Project / work{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                className="input"
                placeholder={
                  formMode === "advance"
                    ? "e.g. Sharma Villa — advance for window work"
                    : "e.g. Sharma Villa — fitted 12 windows"
                }
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
                placeholder="Notes, site, deductions…"
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
              {saving ? "Saving…" : editingId ? "Save changes" : "Save"}
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

      {error && !showForm && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <p className="text-sm text-slate-400 p-6 text-center font-body">
            Loading…
          </p>
        ) : visibleEntries.length === 0 ? (
          <p className="text-sm text-slate-400 p-10 text-center font-body">
            No labour entries yet. Add work or give an advance to start the
            running account.
          </p>
        ) : (
          <>
            <div className="xl:hidden divide-y divide-slate-100">
              {visibleEntries.map((entry) => {
                const running = runningBalances.get(entry.id) ?? 0;
                const isAdvance = Number(entry.amount_owed) <= 0;
                return (
                  <div key={entry.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm text-ink">
                          {entry.worker_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDateShort(entry.entry_date)} ·{" "}
                          {modeLabel(entry.payment_mode)}
                          {isAdvance && (
                            <span className="ml-2 font-semibold text-green-700">
                              Advance
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-slate-500 font-body mt-1">
                          {entry.work_description ||
                            (isAdvance ? "Advance payment" : "Work")}
                        </p>
                        {entry.notes && (
                          <p className="text-xs text-slate-400 font-body mt-1">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="font-mono font-bold">
                          {Number(entry.amount_owed) > 0
                            ? inr(Number(entry.amount_owed), 2)
                            : "—"}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          Paid{" "}
                          {Number(entry.amount_paid) > 0
                            ? inr(Number(entry.amount_paid), 2)
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className={`text-xs font-semibold ${balanceClass(
                          running
                        )}`}
                      >
                        Balance: {balanceText(running)}
                      </p>
                      <div className="flex gap-3 text-xs">
                        <button
                          onClick={() => startEdit(entry)}
                          className="text-brand-600 hover:underline font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(entry.id)}
                          className="text-red-500 hover:underline font-semibold"
                        >
                          Delete
                        </button>
                      </div>
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
                    <th className="p-4">Project / work</th>
                    <th className="p-4 text-right">Work</th>
                    <th className="p-4 text-right">Paid</th>
                    <th className="p-4 text-right">
                      {workerFilter === "all"
                        ? "Worker balance"
                        : "Running balance"}
                    </th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEntries.map((entry) => {
                    const running = runningBalances.get(entry.id) ?? 0;
                    const isAdvance = Number(entry.amount_owed) <= 0;
                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="p-4 whitespace-nowrap text-slate-500">
                          {formatDateShort(entry.entry_date)}
                        </td>
                        <td className="p-4 font-medium text-ink">
                          {entry.worker_name}
                        </td>
                        <td className="p-4 text-slate-500 max-w-xs">
                          <p className="truncate">
                            {entry.work_description ||
                              (isAdvance ? "Advance payment" : "Work")}
                          </p>
                          <div className="flex items-center gap-2">
                            {isAdvance && (
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-green-700">
                                Advance
                              </span>
                            )}
                            {entry.notes && (
                              <p className="text-xs text-slate-400 truncate">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono">
                          {Number(entry.amount_owed) > 0
                            ? inr(Number(entry.amount_owed), 2)
                            : "—"}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-600">
                          {Number(entry.amount_paid) > 0
                            ? inr(Number(entry.amount_paid), 2)
                            : "—"}
                        </td>
                        <td
                          className={`p-4 text-right font-mono font-semibold ${balanceClass(
                            running
                          )}`}
                        >
                          {balanceText(running)}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => startEdit(entry)}
                            className="text-brand-600 hover:underline text-xs font-semibold mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(entry.id)}
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

      <p className="text-xs text-slate-400 font-body">
        Balance carries forward across months for each worker. Paid amounts also
        count under Expenses.
      </p>
    </div>
  );
}
