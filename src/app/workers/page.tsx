"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { inr } from "@/lib/format";
import { toast } from "@/lib/toast";
import BackButton from "@/components/BackButton";

type Worker = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  opening_balance: number | string;
  total_owed: number;
  total_paid: number;
  balance_owed: number;
};

const EMPTY = {
  name: "",
  phone: "",
  email: "",
  opening_balance: "",
};

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/workers");
      const json = await res.json();
      setWorkers(json.workers ?? []);
    } catch {
      toast.error("Could not load workers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          opening_balance: form.opening_balance
            ? parseFloat(form.opening_balance)
            : 0,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Could not add worker.");
        return;
      }
      toast.success("Worker added.");
      setForm(EMPTY);
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorker(w: Worker) {
    if (
      !confirm(
        `Delete ${w.name}? Their labour entries are kept, but they will no longer be linked to this worker.`
      )
    )
      return;
    const res = await fetch(`/api/workers/${w.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Worker deleted.");
      load();
    } else {
      toast.error("Could not delete worker.");
    }
  }

  return (
    <div className="space-y-7">
      <BackButton href="/dashboard" label="Back to Dashboard" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Workers</h1>
          <p className="page-subtitle">
            {workers.length} saved {workers.length === 1 ? "worker" : "workers"}
          </p>
        </div>
        <button
          className="btn-primary w-full sm:w-auto"
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? "Cancel" : "+ Add worker"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addWorker} className="card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label-lg">Name *</label>
              <input
                className="input"
                placeholder="e.g. Ramesh"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <label className="label-lg">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label-lg">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label-lg">Opening balance (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="input font-mono"
                placeholder="0"
                value={form.opening_balance}
                onChange={(e) =>
                  setForm({ ...form, opening_balance: e.target.value })
                }
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary w-full sm:w-auto"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save worker"}
          </button>
        </form>
      )}

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : !workers.length ? (
          <p className="p-8 text-center text-slate-500">
            No workers yet. Add one, or record a labour entry with a new name.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
                <th className="p-4">Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4 text-right">Work</th>
                <th className="p-4 text-right">Paid</th>
                <th className="p-4 text-right">Balance</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.id} className="table-row">
                  <td className="p-4 font-semibold text-ink">
                    <Link
                      href={`/workers/${w.id}`}
                      className="hover:text-brand-700"
                    >
                      {w.name}
                    </Link>
                  </td>
                  <td className="p-4 text-slate-500">{w.phone || "—"}</td>
                  <td className="p-4 text-right font-mono">
                    {inr(w.total_owed)}
                  </td>
                  <td className="p-4 text-right font-mono">
                    {inr(w.total_paid)}
                  </td>
                  <td
                    className={`p-4 text-right font-mono font-semibold ${
                      w.balance_owed > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {inr(Math.abs(w.balance_owed))}
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <Link
                      href={`/workers/${w.id}`}
                      className="text-brand-600 hover:text-brand-800 text-sm font-semibold mr-3"
                    >
                      Statement
                    </Link>
                    <button
                      onClick={() => deleteWorker(w)}
                      className="text-slate-400 hover:text-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
