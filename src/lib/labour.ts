import type { SupabaseClient } from "@supabase/supabase-js";

export type LabourEntry = {
  id: string;
  entry_date: string;
  worker_name: string;
  work_description: string | null;
  amount_owed: number | string;
  amount_paid: number | string;
  payment_mode: string;
  reference_number: string | null;
};

export function labourBalance(owed: number | string, paid: number | string) {
  return Math.max(0, Number(owed) - Number(paid));
}

export function labourExpenseDescription(
  entry: Pick<LabourEntry, "worker_name" | "work_description">
) {
  return entry.work_description
    ? `${entry.worker_name} — ${entry.work_description}`
    : entry.worker_name;
}

export async function syncLabourExpense(
  sb: SupabaseClient,
  entry: LabourEntry
): Promise<string | null> {
  const paid = Number(entry.amount_paid);
  const { data: existing, error: lookupError } = await sb
    .from("expenses")
    .select("id")
    .eq("labour_entry_id", entry.id)
    .maybeSingle();
  if (lookupError) return lookupError.message;

  if (paid <= 0) {
    if (existing) {
      const { error } = await sb
        .from("expenses")
        .delete()
        .eq("id", existing.id);
      if (error) return error.message;
    }
    return null;
  }

  const payload = {
    expense_date: entry.entry_date,
    category: "labour",
    description: labourExpenseDescription(entry),
    amount: paid,
    payment_mode: entry.payment_mode,
    reference_number: entry.reference_number || null,
    labour_entry_id: entry.id,
  };

  const { error } = existing
    ? await sb.from("expenses").update(payload).eq("id", existing.id)
    : await sb.from("expenses").insert(payload);

  return error?.message ?? null;
}
