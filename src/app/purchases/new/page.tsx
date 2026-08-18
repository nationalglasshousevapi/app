"use client";

import { Suspense } from "react";
import PurchaseForm, { blankPurchase } from "@/components/PurchaseForm";

function NewPurchaseInner() {
  return <PurchaseForm initial={blankPurchase()} />;
}

export default function NewPurchasePage() {
  return (
    <div className="space-y-7">
      <a href="/purchases" className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1">
        <span>&larr;</span> Back to Purchases
      </a>
      <div>
        <p className="text-sm font-semibold text-brand-600">New entry</p>
        <h1 className="page-title">Purchase Entry</h1>
        <p className="page-subtitle">Record stock or materials purchased from a supplier.</p>
      </div>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-400">Loading...</p>
        </div>
      }>
        <NewPurchaseInner />
      </Suspense>
    </div>
  );
}
