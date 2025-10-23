"use client";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Card, CardBody, Button, Input } from "@/components/ui";
import Link from "next/link";
import { useToast } from "@/components/Toast";

function generateNickname() {
  const adjectives = [
    "Brave","Swift","Clever","Bright","Curious","Lucky","Mighty","Nimble","Epic","Calm",
    "Quick","Happy","Kind","Fierce","Chill","Sharp","Zesty","Sunny","Bold","Witty"
  ];
  const animals = [
    "Koala","Panda","Falcon","Otter","Dingo","Kangaroo","Quokka","Eagle","Dolphin","Penguin",
    "Tiger","Wolf","Lynx","Cobra","Hawk","Whale","Heron","Ibis","Wombat","Platypus"
  ];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const b = animals[Math.floor(Math.random() * animals.length)];
  const n = Math.floor(100 + Math.random() * 900); // 3-digit for uniqueness
  return `${a}${b}${n}`;
}

export default function StudentJoinPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanCode = useMemo(() => code.trim().toUpperCase(), [code]);
  const canJoin = cleanCode.length >= 3 && !loading;

  async function join() {
    if (!canJoin) return;

    const sessionCode = cleanCode;
    const studentName = name.trim().length >= 2 ? name.trim() : generateNickname();

    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

      // Validate session exists
      const configResponse = await fetch(`${backendUrl}/sessions/${sessionCode}/config`);

      if (configResponse.status === 404) {
        showToast("❌ Session not found. Please check the code.", "error");
        setLoading(false);
        return;
      }

      if (!configResponse.ok) {
        showToast("❌ Unable to connect. Please try again.", "error");
        setLoading(false);
        return;
      }

      // Check for duplicate username
      const leaderboardResponse = await fetch(`${backendUrl}/sessions/${sessionCode}/leaderboard`);
      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json();
        const existingNames = leaderboardData.leaderboard?.students?.map((s: any) => s.student_id) || [];

        if (existingNames.includes(studentName)) {
          showToast("❌ Username already taken. Please choose a different name.", "error");
          setLoading(false);
          return;
        }
      }

      // Valid session with unique name - join it
      sessionStorage.setItem("mvp_code", sessionCode);
      sessionStorage.setItem("mvp_name", studentName);
      router.push("/student/play");
    } catch (error) {
      showToast("❌ Connection error. Check your internet.", "error");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center">
        <Card className="w-full">
          <CardBody className="p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🎉</div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Join a session
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Enter your nickname and the code your lecturer shared.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm text-gray-700">Your nickname</label>
                <Input
                  placeholder="e.g. Alex (or leave blank for a fun nickname)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && join()}
                  aria-label="Your nickname"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Session code</label>
                <Input
                  placeholder="e.g. 39KQ"
                  value={cleanCode}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && join()}
                  aria-label="Session code"
                  inputMode="text"
                  autoCapitalize="characters"
                />
              </div>

              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="text-sm font-medium">Back</span>
                </Link>
                <Button
                  onClick={join}
                  disabled={!canJoin}
                >
                  {loading ? "Joining..." : "🚀 Join now"}
                </Button>
              </div>

              <p className="text-xs text-slate-500">
                No accounts needed. Your nickname is only used for this session.
              </p>
            </div>
          </CardBody>
        </Card>
      </main>
    </div>
  );
}
