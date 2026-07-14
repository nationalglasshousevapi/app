"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { inr } from "@/lib/format";
import BackButton from "@/components/BackButton";
import EditCustomerModal from "@/components/EditCustomerModal";

type Customer = {
  id: string;
  name: string;
  address: string | null;
  contact_person: string | null;
  contact_number: string | null;
  email: string | null;
  gst: string | null;
};

const EMPTY = {
  name: "",
  address: "",
  contact_person: "",
  contact_number: "",
  email: "",
  gst: "",
  opening_balance: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoiceCounts, setInvoiceCounts] = useState<Record<string, number>>({});
  const [balanceData, setBalanceData] = useState<Record<string, number>>({});
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  async function load(query = "") {
    setLoading(true);
    const [custRes, statsRes, ledgerRes] = await Promise.all([
      fetch(`/api/customers${query ? `?q=${encodeURIComponent(query)}` : ""}`),
      fetch("/api/customers/stats"),
      fetch("/api/accounts/balances"),
    ]);
    const custJson = await custRes.json();
    const statsJson = await statsRes.json();
    const ledgerJson = await ledgerRes.json();
    setCustomers(custJson.customers ?? []);
    setInvoiceCounts(statsJson.counts ?? {});
    const bal: Record<string, number> = {};
    for (const c of ledgerJson.balances ?? []) {
      bal[c.customer_id] = Number(c.balance_due);
    }
    setBalanceData(bal);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, opening_balance: form.opening_balance ? parseFloat(form.opening_balance) : 0 }),
    });
    setForm(EMPTY);
    setShowForm(false);
    load(q);
  }

  async function editCustomer(id: string) {
    const res = await fetch(`/api/customers/${id}`);
    const json = await res.json();
    if (json.customer) setEditingCustomer(json.customer);
  }

  async function deleteCustomer(id: string) {
    if (!confirm("Delete this customer? This does not affect past documents.")) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    load(q);
  }

  return (
    <div className="space-y-7">
      <BackButton href="/dashboard" label="Back to Dashboard" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{customers.length} saved customers</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Add customer"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addCustomer} className="card p-6 md:p-8 grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <h2 className="font-bold text-lg">Add a customer</h2>
            <p className="text-sm text-slate-500">Save their details once to fill invoices faster.</p>
          </div>
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">GST</label>
            <input
              className="input"
              value={form.gst}
              onChange={(e) => setForm({ ...form, gst: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Contact Person</label>
            <input
              className="input"
              value={form.contact_person}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Contact Number</label>
            <input
              className="input"
              value={form.contact_number}
              onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Opening Balance <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.opening_balance}
              onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Save customer
            </button>
          </div>
        </form>
      )}

      <input
        className="input max-w-md"
        placeholder="Search by customer name, phone or GST…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
              <th className="p-4">Name</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Phone</th>
              <th className="p-4">GST</th>
              <th className="p-4 text-center">Invoices</th>
              <th className="p-4 text-right">Balance</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="table-row">
                <td className="p-4">
                  <Link href={`/documents?customer_id=${c.id}`} className="font-semibold text-brand-700 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="p-4 text-slate-500">{c.contact_person || "—"}</td>
                <td className="p-4 text-slate-500">{c.contact_number || "—"}</td>
                <td className="p-4 text-slate-500">{c.gst || "—"}</td>
                <td className="p-4 text-center">
                  <span className="font-semibold text-slate-700">{invoiceCounts[c.id] ?? 0}</span>
                </td>
                <td className="p-4 text-right font-mono">
                  <Link href={`/accounts/${c.id}`} className="text-brand-600 hover:underline">
                    {inr(balanceData[c.id] ?? 0)}
                  </Link>
                </td>
                <td className="p-4 text-right flex items-center justify-end gap-1">
                  <button
                    className="inline-flex items-center justify-center p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition"
                    onClick={() => editCustomer(c.id)}
                    title="Edit customer"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    className="inline-flex items-center justify-center p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                    onClick={() => deleteCustomer(c.id)}
                    title="Delete customer"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !customers.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-400">
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSaved={() => {
            setEditingCustomer(null);
            load(q);
          }}
        />
      )}
    </div>
  );
}
