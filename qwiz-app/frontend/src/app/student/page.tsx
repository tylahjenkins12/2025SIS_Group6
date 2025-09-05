"use client";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Card, CardBody, Button, Input } from "@/components/ui";

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
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const cleanCode = useMemo(() => code.trim().toUpperCase(), [code]);
  const canJoin = cleanCode.length >= 3; // tolerate 3–5 char codes

  function join() {
    const c = cleanCode;
    const n = name.trim().length >= 2 ? name.trim() : generateNickname();
    if (!canJoin) return;
    sessionStorage.setItem("mvp_code", c);
    sessionStorage.setItem("mvp_name", n);
    router.push("/student/play");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center">
        <Card className="w-full">
          <CardBody className="p-6 sm:p-8">
            {/* Title + helper */}
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

            {/* Form */}
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

              <Button
                className="w-full"
                onClick={join}
                disabled={!canJoin}
                aria-disabled={!canJoin}
              >
                🚀 Join now
              </Button>

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
