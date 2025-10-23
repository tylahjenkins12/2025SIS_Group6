import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Qwiz Master (MVP)",
  description: "Live lecture quiz MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} min-h-screen bg-[linear-gradient(180deg,#f6f9ff,#ffffff)] text-slate-900 antialiased`}
      >
        <ToastProvider>
          <main className="min-h-screen">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
