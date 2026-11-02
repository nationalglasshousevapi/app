import Link from "next/link";
import BackButton from "@/components/BackButton";
import LabourManager from "@/components/LabourManager";

export const dynamic = "force-dynamic";

export default function LabourPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <BackButton href="/dashboard" label="Back to Dashboard" />
      <div className="flex items-start justify-between gap-4">
        <h1 className="page-title">Labour</h1>
        <Link href="/workers" className="btn-secondary text-sm">
          Workers
        </Link>
      </div>
      <p className="text-sm text-slate-500 font-body -mt-2 mb-6">
        A running account for every worker. Add work as it happens, give
        advances any time, and the balance carries forward. Paid amounts also
        count under Expenses.
      </p>
      <LabourManager />
    </div>
  );
}
