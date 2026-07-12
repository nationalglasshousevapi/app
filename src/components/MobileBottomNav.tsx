"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/documents", label: "Documents", icon: "▤" },
  { href: "/customers", label: "Customers", icon: "♙" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/documents") return pathname.startsWith("/documents/") || pathname === "/documents";
    return pathname === href;
  };

  const isNewDocPage = pathname === "/documents/new";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] h-full px-3 rounded-xl transition-colors ${
                active
                  ? "text-brand-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span className="text-xl leading-none" aria-hidden>{tab.icon}</span>
              <span className={`text-[10px] font-semibold leading-tight ${active ? "text-brand-600" : "text-slate-400"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}

        <Link
          href="/documents/new"
          className={`flex items-center justify-center w-14 h-14 -mt-4 rounded-full shadow-lg transition-transform active:scale-95 ${
            isNewDocPage
              ? "bg-secondary-600 ring-4 ring-secondary-100"
              : "bg-secondary-500 hover:bg-secondary-600"
          } text-white`}
          aria-label="Create new document"
        >
          <span className="text-2xl leading-none font-light">+</span>
        </Link>

        <div className="min-w-[64px]" />
      </div>
    </nav>
  );
}
