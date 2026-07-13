"use client";

import Link from "next/link";
import { inr } from "@/lib/format";

interface Props {
  customerId: string;
  customerName: string;
  totalInvoiced: number;
  totalPaid: number;
  balanceDue: number;
}

export default function AccountSummaryCard({
  customerId,
  customerName,
  totalInvoiced,
  totalPaid,
  balanceDue,
}: Props) {
  const statusColor =
    balanceDue <= 0
      ? "text-green-600"
      : balanceDue > totalInvoiced * 0.5
        ? "text-red-600"
        : "text-amber-600";

  return (
    <Link
      href={`/accounts/${customerId}`}
      className="card p-5 block transition hover:border-brand-200 hover:shadow-md"
    >
      <div className="text-sm font-semibold text-slate-500 mb-2">{customerName}</div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Invoiced</span>
          <span>{inr(totalInvoiced)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Paid</span>
          <span>{inr(totalPaid)}</span>
        </div>
        <div className={`flex justify-between font-semibold ${statusColor}`}>
          <span>Balance Due</span>
          <span>{inr(balanceDue)}</span>
        </div>
      </div>
    </Link>
  );
}
