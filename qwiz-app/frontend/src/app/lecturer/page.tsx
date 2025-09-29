// Lecturer start page// 
"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardBody, Button } from "@/components/ui";
import Link from "next/link";
import { useToast } from "@/components/Toast";

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

export default function LecturerStartPage() {
  const router = useRouter();
  // const [code] = useState(makeCode());
  const [code, setCode] = useState("");
  const { showToast } = useToast();
  const [sessionConfig, setSessionConfig] = useState({
    lecturerName: "",
    courseName: "",
    answerTimeSeconds: 30,
    transcriptionIntervalMinutes: 5
  });
  const [isCreating, setIsCreating] = useState(false);

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

  const createSession = async () => {
    if (!sessionConfig.lecturerName.trim() || !sessionConfig.courseName.trim()) {
      showToast("❌ Please fill in lecturer name and course name", "error");
      return;
    }

    setIsCreating(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE || "http://localhost:8080";
      const response = await fetch(`${backendUrl}/start-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lecturer_name: sessionConfig.lecturerName,
          course_name: sessionConfig.courseName,
          answer_time_seconds: sessionConfig.answerTimeSeconds,
          transcription_interval_minutes: sessionConfig.transcriptionIntervalMinutes
        })
      });

      if (response.ok) {
        const data = await response.json();
        showToast("✅ Session created successfully!", "success");
        router.push(`/lecturer/session?sessionId=${data.sessionId}`);
      } else {
        throw new Error("Failed to create session");
      }
    } catch (error) {
      showToast("❌ Failed to create session. Try again.", "error");
    } finally {
      setIsCreating(false);
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
                  Configure your session settings and start teaching.
                </p>
              </div>
            </div>

            {/* Session Configuration Form */}
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Lecturer Name *
                  </label>
                  <input
                    type="text"
                    value={sessionConfig.lecturerName}
                    onChange={(e) => setSessionConfig(prev => ({ ...prev, lecturerName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Course Name *
                  </label>
                  <input
                    type="text"
                    value={sessionConfig.courseName}
                    onChange={(e) => setSessionConfig(prev => ({ ...prev, courseName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Course name"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Answer Time
                  </label>
                  <select
                    value={sessionConfig.answerTimeSeconds}
                    onChange={(e) => setSessionConfig(prev => ({ ...prev, answerTimeSeconds: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={20}>20 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={45}>45 seconds</option>
                    <option value={60}>1 minute</option>
                    <option value={90}>1.5 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Transcription Interval
                  </label>
                  <select
                    value={sessionConfig.transcriptionIntervalMinutes}
                    onChange={(e) => setSessionConfig(prev => ({ ...prev, transcriptionIntervalMinutes: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={7}>7 minutes</option>
                    <option value={9}>9 minutes</option>
                    <option value={12}>12 minutes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex items-center justify-between">
              <Link
                href="/"
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm font-medium">Back</span>
              </Link>
              <Button onClick={createSession} disabled={isCreating}>
                {isCreating ? "Creating..." : "Start session"}
              </Button>
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
