// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { Container } from "@/components/ui";
import { ToastProvider } from "@/components/Toast"; // 👈 import our provider

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Qwiz Master (MVP)",
  description: "Live lecture quiz MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Body gradient is sitewide; sections can still add their own full-bleed backgrounds */}
      <body
        className={`${inter.variable} min-h-screen bg-[linear-gradient(180deg,#f6f9ff,#ffffff)] text-slate-900 antialiased`}
      >
        {/* Provide toast context to the entire app */}
        <ToastProvider>
          {/* Full-width main so page sections can be edge-to-edge */}
          <main className="min-h-screen">{children}</main>

          {/* Optional lightweight footer */}
          <footer className="border-t border-slate-100 bg-white/70 py-6 text-xs text-slate-600 backdrop-blur">
            <Container>MVP demo — no backend wired yet</Container>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
