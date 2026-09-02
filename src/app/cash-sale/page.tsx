import BackButton from "@/components/BackButton";
import CashSaleForm from "@/components/CashSaleForm";

export const dynamic = "force-dynamic";

export default function NewCashSalePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <BackButton href="/documents" label="Back to Documents" />
      <h1 className="page-title">Quick Cash Sale</h1>
      <p className="text-sm text-slate-500 font-body -mt-2 mb-6">
        Counter sale &mdash; creates an order and records any advance payment. Convert to an invoice only when the customer needs one.
      </p>
      <CashSaleForm />
    </main>
  );
}
