"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PersonIcon, DashboardIcon, DocumentIcon, CartIcon } from "./icons";

const TABS = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/documents", label: "Documents", icon: "document" },
  { href: "/purchases", label: "Purchases", icon: "cart" },
  { href: "/customers", label: "Customers", icon: "person" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/documents")
      return pathname.startsWith("/documents/") || pathname === "/documents";
    if (href === "/purchases")
      return pathname.startsWith("/purchases/") || pathname === "/purchases";
    return pathname === href;
  };

  const isNewDocPage = pathname === "/documents/new";

  const renderTab = (tab: (typeof TABS)[number]) => {
    const active = isActive(tab.href);
    return (
      <Link
        key={tab.href}
        href={tab.href}
        className={`flex flex-col items-center justify-center gap-0.5 min-w-0 h-full py-2 rounded-xl transition-colors ${
          active ? "text-brand-600" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <span className="w-5 h-5 flex items-center justify-center" aria-hidden>
          {tab.icon === "person" ? (
            <PersonIcon className="w-5 h-5" />
          ) : tab.icon === "dashboard" ? (
            <DashboardIcon className="w-5 h-5" />
          ) : tab.icon === "cart" ? (
            <CartIcon className="w-5 h-5" />
          ) : (
            <DocumentIcon className="w-5 h-5" />
          )}
        </span>
        <span
          className={`text-[10px] font-semibold leading-tight truncate max-w-full ${active ? "text-brand-600" : "text-slate-400"}`}
        >
          {tab.label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-brand-600/10 bg-white md:hidden safe-area-bottom">
      <div className="grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center h-16">
        {TABS.slice(0, 2).map(renderTab)}

        <div className="flex items-center justify-center px-1">
          <Link
            href="/documents/new"
            className={`flex items-center justify-center w-14 h-14 -mt-6 rounded-full shadow-lg transition-transform active:scale-95 ${
              isNewDocPage
                ? "bg-brass-600 ring-4 ring-brass-100"
                : "bg-brass-500 hover:bg-brass-600"
            } text-white`}
            aria-label="Create new document"
          >
            <span className="text-2xl leading-none font-light">+</span>
          </Link>
        </div>

        {TABS.slice(2).map(renderTab)}
      </div>
    </nav>
  );
}
