import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import { isAuthenticated } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import PageTransition from "@/components/PageTransition";

const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const fontBody = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`}
    >
      <body className="font-body">
        {authed ? (
          <div className="min-h-screen md:flex">
            <Sidebar />
            <main className="flex-1 p-5 md:p-8 lg:p-10 max-w-7xl mx-auto w-full pb-24 md:pb-0">
              <PageTransition>{children}</PageTransition>
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
