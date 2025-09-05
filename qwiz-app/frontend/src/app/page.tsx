// app/page.tsx
import Link from "next/link";
import { Card, CardBody, Button } from "@/components/ui";
import PreviewMock from "@/components/PreviewMock";

export default function HomePage() {
  return (
    <div className="w-full">
      {/* Page Header (desktop + mobile) */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-semibold tracking-tight text-slate-800">
            <span className="inline-flex items-center gap-2">
              <span className="text-xl">📝</span>
              <span>Qwiz</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
            <a href="#how" className="hover:text-slate-900">
              How it works
            </a>
            <a href="#features" className="hover:text-slate-900">
              Features
            </a>
            <a href="#privacy" className="hover:text-slate-900">
              Privacy
            </a>
            <Link href="/contact" className="hover:text-slate-900">
              Contact
            </Link>
          </nav>

          {/* Mobile menu (no extra deps) */}
          <details className="relative sm:hidden">
            <summary
              className="list-none cursor-pointer rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              aria-label="Open menu"
            >
              Menu
            </summary>
            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <a href="#how" className="block px-4 py-2 text-sm hover:bg-slate-50">
                How it works
              </a>
              <a href="#features" className="block px-4 py-2 text-sm hover:bg-slate-50">
                Features
              </a>
              <a href="#privacy" className="block px-4 py-2 text-sm hover:bg-slate-50">
                Privacy
              </a>
              <Link href="/contact" className="block px-4 py-2 text-sm hover:bg-slate-50">
                Contact
              </Link>
            </div>
          </details>
        </div>
      </header>

      {/* HERO (full-bleed) */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div className="text-center lg:text-left">
            <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
              Engage your class. Get instant feedback. Learn smarter.
            </h1>
            <p className="mt-4 text-base text-slate-600 sm:text-lg">
              Real-time AI quizzes for lectures with instant insights.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Button asChild>
                <Link href="/lecturer" aria-label="Start a session as a lecturer">
                  Start a session
                </Link>
              </Button>
            </div>
            <p id="privacy" className="mt-3 text-xs text-slate-500 sm:text-sm">
              No student accounts. No data stored after class.
            </p>
          </div>

          {/* Split CTA cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="transition hover:-translate-y-0.5 hover:shadow-md focus-within:shadow-md">
              <CardBody>
                <h2 className="text-lg font-semibold sm:text-xl">🎓 Lecturer</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Start & publish questions to your class.
                </p>
                <div className="mt-4">
                  <Button asChild aria-label="I'm teaching">
                    <Link href="/lecturer">I’m teaching</Link>
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card className="transition hover:-translate-y-0.5 hover:shadow-md focus-within:shadow-md">
              <CardBody>
                <h2 className="text-lg font-semibold sm:text-xl">📚 Student</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Join with a code & answer MCQs.
                </p>
                <div className="mt-4">
                  <Button variant="secondary" asChild aria-label="I'm learning">
                    <Link href="/student">I’m learning</Link>
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust strip (full-bleed, subtle) */}
      <section className="border-y border-slate-100 bg-slate-50/60">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-2 px-4 py-4 text-center text-xs text-slate-600 sm:grid-cols-3 sm:text-sm sm:px-6">
          <div>🏫 Built at UTS SIS</div>
          <div>🔒 Privacy-first</div>
          <div>📱 Works on mobile & split-screen</div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h3 className="text-center text-xl font-semibold text-slate-900 sm:text-2xl">How it works</h3>
        <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-3">
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl">🎤</div>
              <h4 className="mt-2 font-medium">Start a session</h4>
              <p className="mt-1 text-sm text-slate-600">Lecturer speaks, Qwiz listens.</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl">🔑</div>
              <h4 className="mt-2 font-medium">Students join</h4>
              <p className="mt-1 text-sm text-slate-600">Enter the session code from any device.</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl">🎉</div>
              <h4 className="mt-2 font-medium">Quiz & feedback</h4>
              <p className="mt-1 text-sm text-slate-600">Instant scoring & live insights.</p>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Preview */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <Card className="overflow-hidden">
          <CardBody className="p-0">
            <PreviewMock duration={20} />
            <div className="px-4 py-3 text-sm text-slate-600 sm:px-6">
              Live leaderboard and instant insights for lecturers.
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h3 className="text-center text-xl font-semibold text-slate-900 sm:text-2xl">Why Qwiz?</h3>
        <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "⚡️", title: "Real-time AI", desc: "Questions generated from the lecture audio." },
            { icon: "✅", title: "Instant feedback", desc: "Scores & answers shown immediately." },
            { icon: "🛡️", title: "No accounts", desc: "Join with a code—nothing stored after class." },
            { icon: "🧩", title: "Classroom-ready", desc: "Responsive, accessible, split-screen friendly." },
          ].map((f) => (
            <Card key={f.title}>
              <CardBody>
                <div className="text-2xl">{f.icon}</div>
                <h4 className="mt-2 font-medium">{f.title}</h4>
                <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
