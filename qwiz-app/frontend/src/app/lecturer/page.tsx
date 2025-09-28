// Lecturer start page// 
"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardBody, Button } from "@/components/ui";
import Link from "next/link";
import { useToast } from "@/components/Toast";


export default function LecturerStartPage() {
  const router = useRouter();
  // const [code] = useState(makeCode());
  const [code, setCode] = useState("");
  const { showToast } = useToast();
  const [sessionConfig, setSessionConfig] = useState({
    lecturerName: "",
    courseName: "",
    questionIntervalSeconds: 30,
    answerTimeSeconds: 30,
    transcriptionIntervalSeconds: 10
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
          question_interval_seconds: sessionConfig.questionIntervalSeconds,
          answer_time_seconds: sessionConfig.answerTimeSeconds,
          transcription_interval_seconds: sessionConfig.transcriptionIntervalSeconds
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

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Question Interval (s)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={sessionConfig.questionIntervalSeconds}
                    onChange={(e) => setSessionConfig(prev => ({ ...prev, questionIntervalSeconds: parseInt(e.target.value) || 30 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Answer Time (s)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={sessionConfig.answerTimeSeconds}
                    onChange={(e) => setSessionConfig(prev => ({ ...prev, answerTimeSeconds: parseInt(e.target.value) || 30 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Transcription Interval (s)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={sessionConfig.transcriptionIntervalSeconds}
                    onChange={(e) => setSessionConfig(prev => ({ ...prev, transcriptionIntervalSeconds: parseInt(e.target.value) || 10 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Continue + student link */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button onClick={createSession} disabled={isCreating}>
                {isCreating ? "Creating..." : "Start session"}
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
