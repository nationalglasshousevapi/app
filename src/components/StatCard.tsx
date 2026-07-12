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
  accent?: "teal" | "brass" | "blue" | "pane";
  href?: string;
}) {
  const accents = {
    teal: "bg-brand-600",
    brass: "bg-brass-500",
    blue: "bg-blue-600",
    pane: "bg-brand-500",
  };

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-slate-500">{label}</div>
        <span className={`h-2 w-2 ${accents[accent]}`} style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }} />
      </div>
      <div className="font-display text-3xl font-bold tracking-tight mt-2 text-ink">{value}</div>
      {sub ? <div className="text-sm text-slate-500 mt-1 font-body">{sub}</div> : null}
      {href ? <div className="text-sm font-semibold text-brand-500 mt-3">View details &rarr;</div> : null}
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
