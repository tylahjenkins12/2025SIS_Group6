import Link from "next/link";
import { Card, CardBody, Button } from "@/components/ui";
import PreviewMock from "@/components/PreviewMock";

export default function AboutPage() {
  return (
    <div className="w-full">
      {/* Page Header */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-semibold tracking-tight text-slate-800">
            <span className="inline-flex items-center gap-2">
              <span className="text-xl">📝</span>
              <span>Qwiz</span>
            </span>
          </Link>

          <nav className="flex items-center gap-6 text-sm text-slate-600">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <Link href="/lecturer" className="hover:text-slate-900">
              Start Session
            </Link>
            <Link href="/student" className="hover:text-slate-900">
              Join Session
            </Link>
          </nav>
        </div>
      </header>

      {/* Page Header */}
      <section className="relative bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-6">
              We believe learning should be a
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent block">
                conversation, not a monologue
              </span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-lg text-slate-600 sm:text-xl">
              That's why we built Qwiz—to transform every lecture into an interactive experience
              where curiosity thrives and every voice matters. 🎓✨
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-4">
            Magic happens in three simple steps
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            We've designed Qwiz to feel effortless, so you can focus on what you do best—teaching!
            Here's how we turn your words into engaging experiences.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <Card className="group hover:shadow-lg transition-all duration-300">
            <CardBody className="text-center p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🎤</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-slate-900">Just start talking</h3>
              <p className="text-slate-600">
                Teach like you always do! Our AI quietly listens to your lecture, understanding the context
                and key concepts you're sharing with your students.
              </p>
            </CardBody>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300">
            <CardBody className="text-center p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-slate-900">We craft the questions</h3>
              <p className="text-slate-600">
                Every few minutes, we generate 3 thoughtful quiz questions based on what you just covered.
                You pick your favorite—we handle the rest!
              </p>
            </CardBody>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300">
            <CardBody className="text-center p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-slate-900">Watch engagement soar</h3>
              <p className="text-slate-600">
                Students join with a simple code and answer in real-time. You'll see exactly who's following
                along and where you might need to slow down or dive deeper.
              </p>
            </CardBody>
          </Card>
        </div>

        <div className="mt-16 bg-slate-50 rounded-2xl p-8 lg:p-12">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              Built with both sides of the classroom in mind
            </h3>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Whether you're teaching or learning, we've made sure Qwiz feels natural and intuitive.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="border-0 shadow-lg">
              <CardBody className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🎓</span>
                  </div>
                  <h4 className="text-xl font-semibold text-slate-900">If you're teaching...</h4>
                </div>
                <div className="space-y-4 text-slate-600">
                  <p className="flex items-start gap-3">
                    <span className="text-indigo-500 mt-1 text-lg">•</span>
                    <span>Set your preferred pace (questions every 5, 7, 9, or 12 minutes)</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-indigo-500 mt-1 text-lg">•</span>
                    <span>Choose from 3 smart questions we generate for each topic</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-indigo-500 mt-1 text-lg">•</span>
                    <span>Watch real-time engagement and spot when students need help</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-indigo-500 mt-1 text-lg">•</span>
                    <span>Keep the energy up with live leaderboards and instant feedback</span>
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardBody className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📚</span>
                  </div>
                  <h4 className="text-xl font-semibold text-slate-900">If you're learning...</h4>
                </div>
                <div className="space-y-4 text-slate-600">
                  <p className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-1 text-lg">•</span>
                    <span>Jump in instantly—just enter a 6-character code, no sign-up needed</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-1 text-lg">•</span>
                    <span>Answer questions that actually relate to what you just heard</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-1 text-lg">•</span>
                    <span>See how you're doing immediately—no waiting for grades</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-1 text-lg">•</span>
                    <span>Stay focused and engaged throughout the entire lecture</span>
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      {/* Preview Demo */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h2 className="text-center text-2xl font-semibold text-slate-900 mb-8">See it in action</h2>
        <Card className="overflow-hidden">
          <CardBody className="p-0">
            <PreviewMock duration={20} />
            <div className="px-4 py-3 text-sm text-slate-600 sm:px-6">
              Live leaderboard and instant insights for lecturers.
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Why Qwiz Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-4">
            The little details that make a big difference
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            We've obsessed over every aspect of the learning experience. Here's what makes
            Qwiz feel different from other classroom tools.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "🎯",
              title: "Questions that actually make sense",
              desc: "Our AI doesn't just hear words—it understands context. Every question connects directly to the concepts you just explained."
            },
            {
              icon: "⚡️",
              title: "Lightning-fast responses",
              desc: "Students see questions instantly, answers appear in real-time, and you get feedback the moment you need it."
            },
            {
              icon: "🛡️",
              title: "Privacy without compromise",
              desc: "No accounts, no data collection, no worries. Everything disappears when class ends—just like a real conversation."
            },
            {
              icon: "📱",
              title: "Works on literally anything",
              desc: "Phones, tablets, laptops, smart boards—if it has a browser, it works. No downloads, no compatibility issues."
            },
            {
              icon: "🎨",
              title: "Your teaching style, amplified",
              desc: "Set your own pace, choose your questions, teach like you always have. We just make it more interactive."
            },
            {
              icon: "🚀",
              title: "Zero learning curve",
              desc: "If you can use a microphone and share a code, you're ready. Students join in seconds, and you're off to the races."
            }
          ].map((feature) => (
            <Card key={feature.title} className="group hover:shadow-lg transition-all duration-300">
              <CardBody className="p-6">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-3 text-slate-900">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob"></div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-2000"></div>
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-6">
            Ready to turn your next lecture into a conversation?
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Join the educators who are discovering that the best learning happens when everyone
            has a voice. Your students are waiting to engage—let's give them that chance! 🌟
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-base px-8 py-3">
              <Link href="/lecturer">Start Your First Session</Link>
            </Button>
            <Button variant="secondary" asChild size="lg" className="text-base px-8 py-3">
              <Link href="/student">Experience It as a Student</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            ✨ No downloads, no accounts, no hassle—just better learning
          </p>
        </div>
      </section>
    </div>
  );
}