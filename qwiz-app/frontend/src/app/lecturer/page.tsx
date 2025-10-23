"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardBody, Button } from "@/components/ui";
import Link from "next/link";
import { useToast } from "@/components/Toast";

export default function LecturerStartPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [sessionConfig, setSessionConfig] = useState({
    lecturerName: "",
    courseName: "",
    answerTimeSeconds: 30,
    transcriptionIntervalMinutes: 5,
    questionReleaseMode: "active"
  });
  const [isCreating, setIsCreating] = useState(false);


  const createSession = async () => {
    if (!sessionConfig.lecturerName.trim() || !sessionConfig.courseName.trim()) {
      showToast("❌ Please fill in all required fields", "error");
      return;
    }

    setIsCreating(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
      const response = await fetch(`${backendUrl}/start-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lecturer_name: sessionConfig.lecturerName,
          course_name: sessionConfig.courseName,
          answer_time_seconds: sessionConfig.answerTimeSeconds,
          transcription_interval_minutes: sessionConfig.transcriptionIntervalMinutes,
          question_release_mode: sessionConfig.questionReleaseMode
        })
      });

      if (response.ok) {
        const data = await response.json();
        showToast("✅ Session created successfully!", "success");
        router.push(`/lecturer/session?sessionId=${data.sessionId}`);
      } else {
        throw new Error("Failed to create session");
      }
    } catch {
      showToast("❌ Failed to create session. Try again.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-start justify-center pt-16">
      <main className="w-full max-w-3xl px-4 sm:px-6">
        <Card className="w-full">
          <CardBody className="p-6 sm:p-8">
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
                    onChange={(e) => setSessionConfig(prev => ({ ...prev, transcriptionIntervalMinutes: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={7}>7 minutes</option>
                    <option value={9}>9 minutes</option>
                    <option value={12}>12 minutes</option>
                  </select>
                </div>
              </div>

              {/* Question Release Mode - Featured Section */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 mb-4">
                <label className="block text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  🤖 AI Question Release Mode
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      sessionConfig.questionReleaseMode === "active"
                        ? "border-indigo-500 bg-white shadow-md"
                        : "border-slate-200 hover:border-indigo-300"
                    }`}
                    onClick={() => setSessionConfig(prev => ({ ...prev, questionReleaseMode: "active" }))}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        sessionConfig.questionReleaseMode === "active"
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-slate-300"
                      }`}>
                        {sessionConfig.questionReleaseMode === "active" && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-slate-800">🎯 Active Mode</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Review and select from 3 AI-generated questions before releasing to students
                    </p>
                  </div>

                  <div
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      sessionConfig.questionReleaseMode === "passive"
                        ? "border-indigo-500 bg-white shadow-md"
                        : "border-slate-200 hover:border-indigo-300"
                    }`}
                    onClick={() => setSessionConfig(prev => ({ ...prev, questionReleaseMode: "passive" }))}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        sessionConfig.questionReleaseMode === "passive"
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-slate-300"
                      }`}>
                        {sessionConfig.questionReleaseMode === "passive" && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-slate-800">⚡ Passive Mode</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      AI automatically releases best question - no interruption to your teaching
                    </p>
                  </div>
                </div>
              </div>
            </div>

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

            <p className="mt-3 text-xs text-slate-500">
              No student accounts. No data stored after class.
            </p>
          </CardBody>
        </Card>
      </main>
    </div>
  );
}
