import BackButton from "@/components/BackButton";
import ExpenseManager from "@/components/ExpenseManager";

export const dynamic = "force-dynamic";

export default function ExpensesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <BackButton href="/dashboard" label="Back to Dashboard" />
      <h1 className="page-title">Expenses</h1>
      <p className="text-sm text-slate-500 font-body -mt-2 mb-6">
        Shop purchases, labour, bills &mdash; everything the business spends.
      </p>
      <ExpenseManager />
    </main>
  );
}
