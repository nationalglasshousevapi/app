import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { buildWorkerLedger } from "@/lib/labour";
import { inr, formatDateShort } from "@/lib/format";
import BackButton from "@/components/BackButton";
import LedgerShareActions from "@/components/LedgerShareActions";
import WorkerEditButton from "@/components/WorkerEditButton";

export const dynamic = "force-dynamic";

export default async function WorkerStatementPage({
  params,
}: {
  params: { id: string };
}) {
  const sb = supabaseServer();
  const ledger = await buildWorkerLedger(sb, params.id);

  if (!ledger) {
    return (
      <div className="mx-auto max-w-4xl">
        <BackButton href="/workers" label="Back to Workers" />
        <p className="text-slate-500 mt-6">Worker not found.</p>
      </div>
    );
  }

  const { worker, entries, totalOwed, totalPaid, balanceOwed } = ledger;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackButton href="/workers" label="Back to Workers" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {worker.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Labour Statement</p>
          <p className="text-sm text-slate-500">
            {[worker.phone, worker.email].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-3">
            <LedgerShareActions
              ledgerId={params.id}
              partyName={worker.name}
              contactNumber={worker.phone}
              kind="worker"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WorkerEditButton
            worker={{
              id: params.id,
              name: worker.name,
              phone: worker.phone,
              email: worker.email,
              opening_balance: Number(worker.opening_balance),
            }}
          />
          <Link href="/labour" className="btn-secondary text-center">
            Record labour
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Opening
          </p>
          <p className="text-xl font-bold font-mono mt-1">
            {inr(worker.opening_balance)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Work done
          </p>
          <p className="text-xl font-bold font-mono mt-1">{inr(totalOwed)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Paid
          </p>
          <p className="text-xl font-bold font-mono mt-1">{inr(totalPaid)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            {balanceOwed >= 0 ? "Balance owed" : "Advance paid"}
          </p>
          <p
            className={`text-xl font-bold font-mono mt-1 ${
              balanceOwed > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {inr(Math.abs(balanceOwed))}
          </p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {entries.length <= 1 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500">
              No labour entries for this worker yet.
            </p>
            <Link href="/labour" className="btn-primary mt-4 inline-block">
              + Record labour
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
                <th className="p-4">Date</th>
                <th className="p-4">Work</th>
                <th className="p-4 text-right">Work amount</th>
                <th className="p-4 text-right">Paid</th>
                <th className="p-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={i}
                  className={`table-row ${
                    entry.type === "opening"
                      ? "font-semibold text-slate-600"
                      : ""
                  }`}
                >
                  <td className="p-4 whitespace-nowrap text-slate-500">
                    {entry.date ? formatDateShort(entry.date) : "—"}
                  </td>
                  <td className="p-4">{entry.description}</td>
                  <td className="p-4 text-right font-mono">
                    {entry.debit > 0 ? inr(entry.debit) : "—"}
                  </td>
                  <td className="p-4 text-right font-mono">
                    {entry.credit > 0 ? inr(entry.credit) : "—"}
                  </td>
                  <td
                    className={`p-4 text-right font-mono font-semibold ${
                      entry.balance > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {inr(Math.abs(entry.balance))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
