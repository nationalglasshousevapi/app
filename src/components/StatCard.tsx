"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function StatCard({
  label,
  value,
  sub,
  accent = "teal",
  href,
  index = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "teal" | "brass" | "blue" | "pane";
  href?: string;
  index?: number;
}) {
  const accents = {
    teal: "bg-brand-600",
    brass: "bg-brass-500",
    blue: "bg-blue-600",
    pane: "bg-brand-500",
  };

  const cardClass = "card p-5 md:p-6";
  const motionProps = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: index * 0.06 },
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
      <motion.div {...motionProps}>
        <Link href={href} className={`${cardClass} block transition hover:border-brand-200 hover:shadow-md`}>
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div {...motionProps} className={cardClass}>
      {content}
    </motion.div>
  );
}
