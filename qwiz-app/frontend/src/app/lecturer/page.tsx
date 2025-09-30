// Lecturer start page// 
"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardBody, Button } from "@/components/ui";
import Link from "next/link";
import { useToast } from "@/components/Toast";

// function makeCode() {
//   const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
//   let c = "";
//   for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
//   return c;
// }

export default function LecturerStartPage() {
  const router = useRouter();
  // const [code] = useState(makeCode());
  const [code, setCode] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    async function getCode() {
      try {
        ////// version 1 of getting code (code generated in backend)
        // const response = await fetch('http://localhost:8080/api/session_id/get');

        ////// version 2 of getting code (create a session + return the data)
        const response = await fetch('http://localhost:8080/start-session', {
          method: 'POST', // declare as a post method
          headers: {
            'Content-Type': 'application/json', // declares data in the body being sent through as a JSON object
          },
          body: JSON.stringify({
            // Add the data the backend expects here - temporarily hardcoded
            lecturer_name: "Test Lecturer",
            course_name: "Test Course",
            question_interval_seconds: 300,
            answer_time_seconds: 60,
          }),
        }); 

        if (!response.ok) {
          throw new Error('Failed to fetch code');
        }
        const data = await response.json();

        ////// version 1 of getting code from response data
        // setCode(data.code); // Access the 'code' key from the returned JSON object as code

        ////// version 2 of getting code from response data
        setCode(data.sessionId); // Access the 'sessionID' key from the returned JSON object as code

      } catch (error) {
        console.error("Error fetching code:", error);
      }
    }
    getCode();
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      showToast("📋 Code copied to clipboard", "success");
    } catch (err) {
      showToast("❌ Copy failed. Try again.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 sm:px-6">
        <Card className="w-full">
          <CardBody className="p-6 sm:p-8">
            {/* Title + helper text */}
            <div className="flex items-start gap-3">
              <div className="text-2xl">🎓</div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Start a session
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Share this code with your class so they can join from any device.
                </p>
              </div>
            </div>

            {/* Session code block */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-6 text-center shadow-sm backdrop-blur">
              <div className="text-xs font-medium tracking-widest text-slate-500 uppercase">
                Session code
              </div>
              <div className="mt-2 font-mono text-5xl font-semibold tracking-wider sm:text-6xl">
                {code}
              </div>
              <div className="mt-4 flex items-center justify-center">
                <Button variant="ghost" onClick={handleCopy}>
                  Copy
                </Button>
              </div>
            </div>

            {/* Continue + student link */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button onClick={() => router.push(`/lecturer/session?code=${code}`)}>
                Start session
              </Button>
              <Link
                href="/student"
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Students: enter code →
              </Link>
            </div>

            {/* Privacy note */}
            <p className="mt-3 text-xs text-slate-500">
              No student accounts. No data stored after class.
            </p>
          </CardBody>
        </Card>
      </main>
    </div>
  );
}
