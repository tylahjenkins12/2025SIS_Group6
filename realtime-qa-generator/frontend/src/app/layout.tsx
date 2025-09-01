import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Classroom MCQ (MVP)",
  description: "Live lecture quiz MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-5xl p-6">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold">Classroom MCQ</h1>
            <nav className="flex gap-4 text-sm">
              <a className="hover:underline" href="/">Home</a>
              <a className="hover:underline" href="/lecturer">Lecturer</a>
              <a className="hover:underline" href="/student">Student</a>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="mt-12 border-t pt-6 text-xs text-gray-500">
            MVP demo — no real backend wired yet
          </footer>
        </div>
      </body>
    </html>
  );
}
