import Link from "next/link";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="w-full">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-semibold tracking-tight text-slate-800">
            <span className="inline-flex items-center gap-2">
              <span className="text-xl">📝</span>
              <span>Qwiz</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <Link href="/about" className="hover:text-slate-900">
              About
            </Link>
            <Link href="/lecturer" className="hover:text-slate-900">
              Start Session
            </Link>
            <Link href="/student" className="hover:text-slate-900">
              Join Session
            </Link>
          </nav>

          <details className="relative sm:hidden">
            <summary
              className="list-none cursor-pointer rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              aria-label="Open menu"
            >
              Menu
            </summary>
            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <Link href="/" className="block px-4 py-2 text-sm hover:bg-slate-50">
                Home
              </Link>
              <Link href="/about" className="block px-4 py-2 text-sm hover:bg-slate-50">
                About
              </Link>
              <Link href="/lecturer" className="block px-4 py-2 text-sm hover:bg-slate-50">
                Start Session
              </Link>
              <Link href="/student" className="block px-4 py-2 text-sm hover:bg-slate-50">
                Join Session
              </Link>
            </div>
          </details>
        </div>
      </header>

      <section className="relative bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Transform Your
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent block">
                Classroom Experience
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600 sm:text-xl">
              AI-powered quizzes that adapt to your lecture in real-time. Engage students,
              get instant feedback, and make learning interactive.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="text-base px-8 py-3">
                <Link href="/lecturer">
                  🎓 Start Teaching
                </Link>
              </Button>
              <Button variant="secondary" asChild className="text-base px-8 py-3">
                <Link href="/student">
                  📚 Join Session
                </Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-slate-500">
              ✨ No accounts required • 🔒 Privacy-first • 📱 Works on any device
            </p>
          </div>

        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-8">
            Start in under 60 seconds
          </h2>

          <div className="grid gap-6 md:grid-cols-3 mb-12">
            <div className="flex items-center justify-center gap-3 text-slate-600">
              <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold">1</span>
              <span>Create session</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-slate-600">
              <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">2</span>
              <span>Start teaching</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-slate-600">
              <span className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-semibold">3</span>
              <span>Students engage</span>
            </div>
          </div>

          <p className="text-lg text-slate-600 mb-8">
            AI generates questions from your lecture. Students join with a code. Get instant feedback.
          </p>

          <Link
            href="/about"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            See detailed walkthrough →
          </Link>
        </div>
      </section>

      <section className="relative py-16 bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              See Qwiz in action
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Watch how easy it is to create engaging quizzes from your lectures
            </p>
          </div>

          {/* Demo Video */}
          <div className="relative aspect-video bg-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <video
              className="w-full h-full object-cover"
              controls
              poster="/demo-poster.jpg"
            >
              <source src="/demo.mp4" type="video/mp4" />
              <source src="/demo.webm" type="video/webm" />
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/about"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Learn more about how it works →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl mb-6">
            Ready to get started?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-white text-indigo-600 hover:bg-gray-50 text-base px-8 py-3">
              <Link href="/lecturer">
                Create Session
              </Link>
            </Button>
            <Button variant="secondary" asChild className="border-white text-white hover:bg-white hover:text-indigo-600 text-base px-8 py-3">
              <Link href="/student">
                Join Session
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
