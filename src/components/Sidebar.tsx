"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/documents", label: "All documents", icon: "▤" },
  { href: "/customers", label: "Customers", icon: "♙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 bg-brand-600 md:min-h-screen md:flex-col">
      <div className="px-4 py-3.5 md:p-6 flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="National Glass House Logo"
          width={100}
          height={30}
          className="object-contain brightness-0 invert"
          unoptimized
        />
      </div>
      <nav className="flex-1 p-4 pt-2 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href === "/documents" && pathname.startsWith("/documents/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-white/15 text-white"
                  : "text-white/65 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className="text-base w-4 text-center" aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/15 space-y-2">
        <Link
          href="/documents/new"
          className="flex items-center justify-center gap-2 rounded-xl bg-brass-500 text-white px-5 py-3 text-sm font-semibold shadow-sm hover:bg-brass-600 transition"
        >
          <span className="text-lg leading-none">+</span> New document
        </Link>
        <button onClick={logout} className="flex items-center justify-center gap-2 rounded-xl border border-white/25 text-white/75 px-5 py-3 text-sm font-semibold hover:bg-white/10 hover:text-white transition w-full">
          Sign out
        </button>
      </div>
    </aside>
  );
}
