import Link from "next/link";

export default function StatCard({
  label,
  value,
  sub,
  accent = "teal",
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "teal" | "amber" | "blue" | "violet";
  href?: string;
}) {
  const accents = {
    teal: "bg-brand-50 text-brand-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
  };

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-slate-500">{label}</div>
        <span className={`h-2.5 w-2.5 rounded-full ${accents[accent]}`} />
      </div>
      <div className="text-3xl font-bold tracking-tight mt-2">{value}</div>
      {sub ? <div className="text-sm text-slate-500 mt-1">{sub}</div> : null}
      {href ? <div className="text-sm font-semibold text-brand-600 mt-3">View details →</div> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card p-5 md:p-6 block transition hover:border-brand-200 hover:shadow-md">
        {content}
      </Link>
    );
  }

  return <div className="card p-5 md:p-6">{content}</div>;
}
