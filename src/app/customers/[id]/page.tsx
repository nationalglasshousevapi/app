import { supabaseServer } from "@/lib/supabaseServer";
import { inr, formatDateReadable, formatDateShort } from "@/lib/format";
import { docTypeLabel } from "@/lib/docTypes";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import CustomerMonthFilter from "@/components/CustomerMonthFilter";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { month?: string; quarter?: string; from?: string; to?: string };
}) {
  const sb = supabaseServer();
  const { id } = params;
  const selectedMonth = searchParams.month || "";
  const selectedQuarter = searchParams.quarter || "";
  const fromSearch = searchParams.from || "";
  const toSearch = searchParams.to || "";

  // Fetch customer
  const { data: customer } = await sb
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (!customer) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <BackButton href="/customers" label="Back to Customers" />
        <p className="text-slate-500 mt-6">Customer not found.</p>
      </main>
    );
  }

  // Fetch balance due
  const { data: ledger } = await sb
    .from("customer_ledger_view")
    .select("balance_due, total_invoiced, total_paid")
    .eq("customer_id", id)
    .single();

  const balanceDue = Number(ledger?.balance_due ?? 0);
  const totalInvoicedOverall = Number(ledger?.total_invoiced ?? 0);
  const totalPaidOverall = Number(ledger?.total_paid ?? 0);

  // Build date range from params
  let monthFrom: string | null = null;
  let monthTo: string | null = null;
  let filterDescription = "All documents";

  if (fromSearch && toSearch) {
    monthFrom = fromSearch;
    monthTo = toSearch;
    filterDescription = `Showing documents from ${fromSearch} to ${toSearch}`;
  } else if (selectedQuarter) {
    const match = selectedQuarter.match(/^(\d{4})-Q([1-4])$/);
    if (match) {
      const y = Number(match[1]);
      const q = Number(match[2]);
      const startMonth = (q - 1) * 3 + 1;
      const endMonth = q * 3;
      monthFrom = `${y}-${String(startMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(y, endMonth, 0).getDate();
      monthTo = `${y}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      filterDescription = `Showing documents for Q${q} ${y}`;
    }
  } else if (selectedMonth) {
    const [y, m] = selectedMonth.split("-");
    monthFrom = `${y}-${m}-01`;
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    monthTo = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
    filterDescription = `Showing documents for ${new Date(selectedMonth + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`;
  }

  // Fetch documents for this customer
  let docQuery = sb
    .from("documents")
    .select("id, doc_type, doc_number, doc_date, total_amount, status, discount_amount, transport_charges, packing_forwarding_charges, cgst_amount, sgst_amount, igst_amount, subtotal")
    .eq("customer_id", id)
    .order("doc_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (monthFrom && monthTo) {
    docQuery = docQuery.gte("doc_date", monthFrom).lte("doc_date", monthTo);
  }

  const { data: documents } = await docQuery;

  // Calculate totals for filtered documents
  const filteredTotal = (documents ?? []).reduce((s, d) => s + Number(d.total_amount), 0);
  const filteredSubtotal = (documents ?? []).reduce((s, d) => s + Number(d.subtotal), 0);
  const filteredDiscount = (documents ?? []).reduce((s, d) => s + Number(d.discount_amount), 0);
  const filteredTax = (documents ?? []).reduce((s, d) => s + Number(d.cgst_amount) + Number(d.sgst_amount) + Number(d.igst_amount), 0);
  const filteredDocCount = (documents ?? []).length;

  const STATUS_STYLES: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    sent: "bg-brass-50 text-brass-700",
    paid: "bg-emerald-50 text-signal-green",
    cancelled: "bg-red-50 text-signal-rust",
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-7">
      <BackButton href="/customers" label="Back to Customers" />

      {/* Customer header */}
      <div className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">{customer.name}</h1>
            <p className="text-sm text-slate-500 mt-1">Customer details</p>
          </div>
          <Link href={`/accounts/${id}`} className="btn-secondary w-full sm:w-auto text-center">
            View Ledger
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {customer.address && (
            <div>
              <span className="block text-xs font-semibold text-slate-500">Address</span>
              <span className="text-ink">{customer.address}</span>
            </div>
          )}
          {customer.contact_person && (
            <div>
              <span className="block text-xs font-semibold text-slate-500">Contact Person</span>
              <span className="text-ink">{customer.contact_person}</span>
            </div>
          )}
          {customer.contact_number && (
            <div>
              <span className="block text-xs font-semibold text-slate-500">Phone</span>
              <span className="text-ink">{customer.contact_number}</span>
            </div>
          )}
          {customer.email && (
            <div>
              <span className="block text-xs font-semibold text-slate-500">Email</span>
              <span className="text-ink">{customer.email}</span>
            </div>
          )}
          {customer.gst && (
            <div>
              <span className="block text-xs font-semibold text-slate-500">GST</span>
              <span className="text-ink">{customer.gst}</span>
            </div>
          )}
          <div>
            <span className="block text-xs font-semibold text-slate-500">Balance Due</span>
            <span className={`font-semibold ${balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>
              {inr(balanceDue)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-xs text-slate-500 font-semibold">Total Invoiced</div>
          <div className="font-display font-bold text-ink mt-1 text-lg">{inr(totalInvoicedOverall)}</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xs text-slate-500 font-semibold">Total Paid</div>
          <div className="font-display font-bold text-ink mt-1 text-lg">{inr(totalPaidOverall)}</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xs text-slate-500 font-semibold">Balance Due</div>
          <div className={`font-display font-bold mt-1 text-lg ${balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>
            {inr(balanceDue)}
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xs text-slate-500 font-semibold">Documents</div>
          <div className="font-display font-bold text-ink mt-1 text-lg">
            {totalInvoicedOverall > 0 ? `${documents?.length ?? 0} (filtered)` : "0"}
          </div>
        </div>
      </div>

      {/* Month filter */}
      <div className="card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display font-bold text-ink">Documents</h2>
            <p className="text-sm text-slate-500">
              {selectedMonth
                ? `Showing documents for ${new Date(selectedMonth + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`
                : "All documents"}
            </p>
          </div>
          <CustomerMonthFilter
            currentMonth={selectedMonth}
            fromDate={fromSearch}
            toDate={toSearch}
            customerId={id}
          />
        </div>

        {/* Month totals */}
        {(documents ?? []).length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-brand-50/50 rounded-xl border border-brand-100">
            <div>
              <div className="text-xs text-slate-500 font-semibold">Documents</div>
              <div className="font-bold text-ink">{filteredDocCount}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Subtotal</div>
              <div className="font-bold text-ink">{inr(filteredSubtotal)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Discount</div>
              <div className="font-bold text-red-600">{inr(filteredDiscount)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Tax</div>
              <div className="font-bold text-ink">{inr(filteredTax)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Total</div>
              <div className="font-bold text-ink">{inr(filteredTotal)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Documents table */}
      <div className="card overflow-x-auto">
        {!documents?.length ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 font-medium">
              {selectedMonth ? "No documents found for this month." : "No documents yet for this customer."}
            </p>
            <Link
              href={`/documents/new?customer_id=${id}`}
              className="btn-primary mt-4 inline-block"
            >
              + Create document
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
                <th scope="col" className="p-4">Number</th>
                <th scope="col" className="p-4">Type</th>
                <th scope="col" className="p-4">Date</th>
                <th scope="col" className="p-4">Status</th>
                <th scope="col" className="p-4 text-right">Amount</th>
                <th scope="col" className="p-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {(documents ?? []).map((doc) => (
                <tr key={doc.id} className="table-row">
                  <td className="p-4 font-semibold text-ink font-mono">{doc.doc_number}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {docTypeLabel(doc.doc_type)}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">{formatDateReadable(doc.doc_date)}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[doc.status] ?? STATUS_STYLES.draft}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-semibold font-mono">{inr(Number(doc.total_amount))}</td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="text-brand-600 hover:text-brand-800 text-sm font-semibold"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
