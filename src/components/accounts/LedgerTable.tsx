"use client";

import Link from "next/link";
import { formatDateShort, inr } from "@/lib/format";

interface LedgerEntry {
  date: string;
  type: "opening" | "invoice" | "payment";
  description: string;
  debit: number;
  credit: number;
  balance: number;
  refId?: string;
}

interface Props {
  entries: LedgerEntry[];
}

export default function LedgerTable({ entries }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50/80">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
            <th scope="col" className="pb-2 font-semibold">Date</th>
            <th scope="col" className="pb-2 font-semibold">Description</th>
            <th scope="col" className="pb-2 font-semibold text-right">Debit</th>
            <th scope="col" className="pb-2 font-semibold text-right">Credit</th>
            <th scope="col" className="pb-2 font-semibold text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const isPositive = entry.balance > 0;
            return (
              <tr
                key={`${entry.type}-${i}`}
                className={`border-b border-slate-100 ${entry.type === "opening" ? "font-semibold text-slate-600" : ""}`}
              >
                <td className="py-2 pr-4 whitespace-nowrap text-slate-500">
                  {entry.date ? formatDateShort(entry.date) : "—"}
                </td>
                <td className="py-2 pr-4">
                  {entry.type === "invoice" && entry.refId ? (
                    <Link href={`/documents/${entry.refId}`} className="text-brand-600 hover:underline">
                      {entry.description}
                    </Link>
                  ) : (
                    <span className="capitalize">{entry.description}</span>
                  )}
                  {entry.type === "payment" && (
                    <span className="ml-1 text-xs text-slate-400">Payment</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-right font-mono">{entry.debit > 0 ? inr(entry.debit) : "—"}</td>
                <td className="py-2 pr-4 text-right font-mono">{entry.credit > 0 ? inr(entry.credit) : "—"}</td>
                <td className={`py-2 text-right font-mono font-semibold ${isPositive ? "text-red-600" : "text-green-600"}`}>
                  {inr(Math.abs(entry.balance))}
                  {isPositive ? " Dr" : " Cr"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
