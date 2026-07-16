"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDateShort, inr } from "@/lib/format";
import EditPaymentModal from "./EditPaymentModal";

interface PaymentDetails {
  id: string;
  payment_date: string;
  amount: number;
  payment_mode: string;
  reference_number: string | null;
  notes: string | null;
}

interface LedgerEntry {
  date: string;
  type: "opening" | "invoice" | "payment";
  description: string;
  debit: number;
  credit: number;
  balance: number;
  refId?: string;
  paymentDetails?: PaymentDetails;
}

interface Props {
  entries: LedgerEntry[];
}

export default function LedgerTable({ entries }: Props) {
  const [editingPayment, setEditingPayment] = useState<PaymentDetails | null>(null);

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
            <th scope="col" className="pb-2 font-semibold text-right">Actions</th>
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
                <td className="py-2 text-right">
                  {entry.type === "payment" && entry.paymentDetails && (
                    <button
                      type="button"
                      onClick={() => setEditingPayment(entry.paymentDetails!)}
                      className="text-slate-400 hover:text-brand-600 transition p-1"
                      title="Edit payment"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editingPayment && (
        <EditPaymentModal
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
        />
      )}
    </div>
  );
}
