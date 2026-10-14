"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDateShort, inr } from "@/lib/format";
import EditPaymentModal from "./EditPaymentModal";
import EditOpeningBalanceModal from "./EditOpeningBalanceModal";

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
  isOrder?: boolean;
  paymentDetails?: PaymentDetails;
}

interface Props {
  entries: LedgerEntry[];
  customerId?: string;
  openingBalance?: number;
  customerName?: string;
}

export default function LedgerTable({
  entries,
  customerId,
  openingBalance,
  customerName,
}: Props) {
  const [editingPayment, setEditingPayment] = useState<PaymentDetails | null>(
    null
  );
  const [editingOpening, setEditingOpening] = useState(false);

  return (
    <div>
      {/* Narrow / zoomed view — cards */}
      <div className="space-y-3 xl:hidden">
        {entries.map((entry, i) => {
          const isPositive = entry.balance > 0;
          return (
            <div
              key={`${entry.type}-${i}`}
              className={`card p-4 space-y-2 ${entry.type === "opening" ? "font-semibold text-slate-600" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">
                    {entry.date ? formatDateShort(entry.date) : "—"}
                  </p>
                  <div className="text-sm">
                    {entry.type === "invoice" && entry.refId ? (
                      <Link
                        href={`/documents/${entry.refId}`}
                        className="text-brand-600 hover:underline"
                      >
                        {entry.description}
                      </Link>
                    ) : (
                      <span className="capitalize">{entry.description}</span>
                    )}
                    {entry.type === "invoice" && entry.isOrder && (
                      <span className="ml-1 text-xs text-slate-400">Order</span>
                    )}
                    {entry.type === "payment" && (
                      <span className="ml-1 text-xs text-slate-400">
                        Payment
                      </span>
                    )}
                  </div>
                </div>
                <p
                  className={`font-mono font-semibold shrink-0 ${isPositive ? "text-red-600" : "text-green-600"}`}
                >
                  {inr(Math.abs(entry.balance))}
                  {isPositive ? " Dr" : " Cr"}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  {entry.debit > 0 && (
                    <span className="font-mono">Dr {inr(entry.debit)}</span>
                  )}
                  {entry.credit > 0 && (
                    <span className="font-mono">Cr {inr(entry.credit)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {entry.type === "opening" && customerId && (
                    <button
                      type="button"
                      onClick={() => setEditingOpening(true)}
                      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-slate-400 hover:text-brand-600 transition rounded-lg"
                      title="Edit opening balance"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        width="16"
                        height="16"
                      >
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  )}
                  {entry.type === "payment" && entry.paymentDetails && (
                    <button
                      type="button"
                      onClick={() => setEditingPayment(entry.paymentDetails!)}
                      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-slate-400 hover:text-brand-600 transition rounded-lg"
                      title="Edit payment"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        width="16"
                        height="16"
                      >
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Wide view — table */}
      <div className="overflow-x-auto hidden xl:block">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50/80">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
              <th scope="col" className="pb-2 font-semibold">
                Date
              </th>
              <th scope="col" className="pb-2 font-semibold">
                Description
              </th>
              <th scope="col" className="pb-2 font-semibold text-right">
                Debit
              </th>
              <th scope="col" className="pb-2 font-semibold text-right">
                Credit
              </th>
              <th scope="col" className="pb-2 font-semibold text-right">
                Balance
              </th>
              <th scope="col" className="pb-2 font-semibold text-right">
                Actions
              </th>
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
                      <Link
                        href={`/documents/${entry.refId}`}
                        className="text-brand-600 hover:underline"
                      >
                        {entry.description}
                      </Link>
                    ) : (
                      <span className="capitalize">{entry.description}</span>
                    )}
                    {entry.type === "invoice" && entry.isOrder && (
                      <span className="ml-1 text-xs text-slate-400">Order</span>
                    )}
                    {entry.type === "payment" && (
                      <span className="ml-1 text-xs text-slate-400">
                        Payment
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono">
                    {entry.debit > 0 ? inr(entry.debit) : "—"}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono">
                    {entry.credit > 0 ? inr(entry.credit) : "—"}
                  </td>
                  <td
                    className={`py-2 text-right font-mono font-semibold ${isPositive ? "text-red-600" : "text-green-600"}`}
                  >
                    {inr(Math.abs(entry.balance))}
                    {isPositive ? " Dr" : " Cr"}
                  </td>
                  <td className="py-2 text-right">
                    {entry.type === "opening" && customerId && (
                      <button
                        type="button"
                        onClick={() => setEditingOpening(true)}
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-slate-400 hover:text-brand-600 transition"
                        title="Edit opening balance"
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          width="16"
                          height="16"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                    )}
                    {entry.type === "payment" && entry.paymentDetails && (
                      <button
                        type="button"
                        onClick={() => setEditingPayment(entry.paymentDetails!)}
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-slate-400 hover:text-brand-600 transition"
                        title="Edit payment"
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          width="16"
                          height="16"
                        >
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
      </div>

      {editingPayment && (
        <EditPaymentModal
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
        />
      )}

      {editingOpening && customerId && openingBalance !== undefined && (
        <EditOpeningBalanceModal
          customerId={customerId}
          currentBalance={openingBalance}
          customerName={customerName ?? ""}
          onClose={() => setEditingOpening(false)}
        />
      )}
    </div>
  );
}
