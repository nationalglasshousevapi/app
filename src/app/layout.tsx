import "./globals.css";
import type { Metadata } from "next";
import { isAuthenticated } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

export const metadata: Metadata = {
  title: "National Glass House",
  description: "Invoicing & document management",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();

  return (
    <html lang="en">
      <body>
        {authed ? (
          <div className="min-h-screen md:flex">
            <Sidebar />
            <main className="flex-1 p-5 md:p-8 lg:p-10 max-w-7xl mx-auto w-full pb-24 md:pb-0">
              {children}
            </main>
            <MobileBottomNav />
          </div>
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            {children}
          </div>
        )}
      </body>
    </html>
  );
}
