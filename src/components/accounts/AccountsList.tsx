"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { inr } from "@/lib/format";

type CustomerAccount = {
  customer_id: string;
  customer_name: string;
  opening_balance: number;
  total_invoiced: number;
  total_paid: number;
  balance_due: number;
  invoice_count: number;
};

type SortField = "customer_name" | "opening_balance" | "total_invoiced" | "total_paid" | "balance_due";
type FilterPreset = "all" | "outstanding" | "paid" | "overdue";

interface Props {
  customers: CustomerAccount[];
}

export default function AccountsList({ customers }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("balance_due");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterPreset, setFilterPreset] = useState<FilterPreset>("all");

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "customer_name" ? "asc" : "desc");
    }
  }

  const filtered = useMemo(() => {
    let list = customers;

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(q)
      );
    }

    // Filter preset
    if (filterPreset === "outstanding") {
      list = list.filter((c) => c.balance_due > 0);
    } else if (filterPreset === "paid") {
      list = list.filter((c) => c.balance_due <= 0);
    } else if (filterPreset === "overdue") {
      list = list.filter((c) => Number(c.total_invoiced) > 0 && c.balance_due > Number(c.total_invoiced) * 0.5);
    }

    // Sort
    list = [...list].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const cmp = typeof aVal === "string" ? (aVal as string).localeCompare(bVal as string) : (Number(aVal) - Number(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [customers, search, sortField, sortDir, filterPreset]);

  const totalReceivable = useMemo(() => customers.reduce((s, c) => s + Number(c.balance_due), 0), [customers]);
  const totalInvoiced = useMemo(() => customers.reduce((s, c) => s + Number(c.total_invoiced), 0), [customers]);
  const totalPaid = useMemo(() => customers.reduce((s, c) => s + Number(c.total_paid), 0), [customers]);

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-brass-500 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div>
      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm font-semibold text-slate-500">Total Receivable</div>
          <div className="font-display text-2xl font-bold text-ink mt-1">{inr(totalReceivable)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-semibold text-slate-500">Total Invoiced</div>
          <div className="font-display text-2xl font-bold text-ink mt-1">{inr(totalInvoiced)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-semibold text-slate-500">Total Paid</div>
          <div className="font-display text-2xl font-bold text-ink mt-1">{inr(totalPaid)}</div>
        </div>
      </div>

      {/* Search + filter presets */}
      <div className="mt-6 space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <input
            className="input w-full"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {([
            { key: "all", label: "All" },
            { key: "outstanding", label: "With Outstanding" },
            { key: "paid", label: "Paid in Full" },
            { key: "overdue", label: "Overdue" },
          ] as { key: FilterPreset; label: string }[]).map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setFilterPreset(p.key)}
              className={`text-sm px-3 py-2 rounded-full border min-h-[40px] inline-flex items-center ${
                filterPreset === p.key
                  ? "bg-brass-500 text-white border-brass-500 shadow-sm"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
          <p className="text-xs text-slate-400 self-center ml-2">
            {filtered.length} of {customers.length} customers
          </p>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="mt-4 space-y-3 md:hidden">
        {filtered.map((c) => {
          const bd = Number(c.balance_due);
          const statusColor = bd <= 0 ? "text-green-600" : bd > Number(c.total_invoiced) * 0.5 ? "text-red-600" : "text-amber-600";
          return (
            <Link
              key={c.customer_id}
              href={`/accounts/${c.customer_id}`}
              className="card p-4 block hover:border-brand-200 transition space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-700">{c.customer_name}</p>
                  <p className="text-xs text-slate-400">{c.invoice_count} invoice{c.invoice_count !== 1 ? "s" : ""}</p>
                </div>
                <p className={`font-semibold font-mono ${statusColor}`}>{inr(bd)}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400">Opening</span>
                  <p className="font-mono font-medium">{inr(Number(c.opening_balance))}</p>
                </div>
                <div>
                  <span className="text-slate-400">Invoiced</span>
                  <p className="font-mono font-medium">{inr(Number(c.total_invoiced))}</p>
                </div>
                <div>
                  <span className="text-slate-400">Paid</span>
                  <p className="font-mono font-medium">{inr(Number(c.total_paid))}</p>
                </div>
              </div>
            </Link>
          );
        })}
        {!filtered.length && (
          <div className="card p-6 text-center text-gray-400">No customers found</div>
        )}
      </div>

      {/* Desktop table */}
      <div className="mt-6 overflow-x-auto hidden md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50/80">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
              <th
                scope="col"
                className="pb-2 font-semibold cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort("customer_name")}
              >
                Customer <SortIcon field="customer_name" />
              </th>
              <th
                scope="col"
                className="pb-2 font-semibold text-right cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort("opening_balance")}
              >
                Opening <SortIcon field="opening_balance" />
              </th>
              <th
                scope="col"
                className="pb-2 font-semibold text-right cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort("total_invoiced")}
              >
                Invoiced <SortIcon field="total_invoiced" />
              </th>
              <th
                scope="col"
                className="pb-2 font-semibold text-right cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort("total_paid")}
              >
                Paid <SortIcon field="total_paid" />
              </th>
              <th
                scope="col"
                className="pb-2 font-semibold text-right cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort("balance_due")}
              >
                Balance Due <SortIcon field="balance_due" />
              </th>
              <th scope="col" className="pb-2 font-semibold text-center">Invoices</th>
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">No customers found.</td>
              </tr>
            ) : (
              filtered.map((c) => {
                const bd = Number(c.balance_due);
                const statusColor = bd <= 0 ? "text-green-600" : bd > Number(c.total_invoiced) * 0.5 ? "text-red-600" : "text-amber-600";
                return (
                  <tr
                    key={c.customer_id}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
                    onClick={() => router.push(`/accounts/${c.customer_id}`)}
                  >
                    <td className="py-2 pr-4">
                      <span className="text-brand-600 font-semibold">{c.customer_name}</span>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">{inr(Number(c.opening_balance))}</td>
                    <td className="py-2 pr-4 text-right font-mono">{inr(Number(c.total_invoiced))}</td>
                    <td className="py-2 pr-4 text-right font-mono">{inr(Number(c.total_paid))}</td>
                    <td className={`py-2 text-right font-mono font-semibold ${statusColor}`}>{inr(bd)}</td>
                    <td className="py-2 text-center text-slate-500 text-xs">{c.invoice_count}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
