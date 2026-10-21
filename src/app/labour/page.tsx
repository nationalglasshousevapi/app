import BackButton from "@/components/BackButton";
import LabourManager from "@/components/LabourManager";

export const dynamic = "force-dynamic";

export default function LabourPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <BackButton href="/dashboard" label="Back to Dashboard" />
      <h1 className="page-title">Labour</h1>
      <p className="text-sm text-slate-500 font-body -mt-2 mb-6">
        Work done by workers, what you owe them and what you have paid. Paid
        amounts also count under Expenses.
      </p>
      <LabourManager />
    </div>
  );
}
