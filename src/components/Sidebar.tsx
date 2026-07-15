"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PersonIcon, DashboardIcon, DocumentIcon, AccountIcon } from "./icons";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/documents", label: "All documents", icon: "document" },
  { href: "/accounts", label: "Accounts", icon: "account" },
  { href: "/customers", label: "Customers", icon: "person" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("ngh_sidebar_collapsed");
    if (saved === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("ngh_sidebar_collapsed", String(collapsed));
    }
  }, [collapsed, mounted]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <motion.aside
      className="hidden md:flex shrink-0 bg-brand-600 sticky top-0 h-screen md:flex-col overflow-hidden"
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ type: "spring", damping: 28, stiffness: 250, mass: 0.8 }}
    >
      {/* Logo + toggle button row */}
      <div className={`flex items-center p-4 md:py-5 ${collapsed ? "justify-center flex-col gap-3" : "justify-between gap-2"}`}>
        {!collapsed && (
          <img
            src="/logo.png"
            alt="National Glass House Logo"
            width={100}
            height={30}
            className="object-contain brightness-0 invert shrink-0"
          />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 pt-2 space-y-1">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === "/documents" && pathname.startsWith("/documents/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-white/15 text-white"
                  : "text-white/65 hover:text-white hover:bg-white/10"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="w-4 h-4 flex items-center justify-center shrink-0" aria-hidden>
                {item.icon === "person" ? (
                  <PersonIcon className="w-4 h-4" />
                ) : item.icon === "dashboard" ? (
                  <DashboardIcon className="w-4 h-4" />
                ) : item.icon === "account" ? (
                  <AccountIcon className="w-4 h-4" />
                ) : (
                  <DocumentIcon className="w-4 h-4" />
                )}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className={`p-3 border-t border-white/15 space-y-2 ${collapsed ? "flex flex-col items-center" : ""}`}>
        <Link
          href="/documents/new"
          className={`btn-primary w-full ${collapsed ? "px-3 py-3" : ""}`}
          title={collapsed ? "New document" : undefined}
        >
          <span className="text-lg leading-none shrink-0">+</span>
          {!collapsed && <span>New document</span>}
        </Link>
        <button
          onClick={logout}
          className={`flex items-center justify-center gap-2 rounded-xl border border-white/25 text-white/75 px-3 py-3 text-sm font-semibold hover:bg-white/10 hover:text-white transition w-full ${
            collapsed ? "" : ""
          }`}
          title={collapsed ? "Sign out" : undefined}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </motion.aside>
  );
}
