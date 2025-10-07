"use client";

import { useEffect, useMemo, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { MCQ, LeaderboardRow, PublicMCQ, BusEvent, RoundResults } from "@/types";
import { bus } from "@/lib/bus";
import { Card, CardBody, Button, Badge } from "@/components/ui";
import { ColumnChart } from "@/components/Chart";
import { MicCapture } from "@/components/MicCapture";
import { QuestionSelector } from "@/components/QuestionSelector";
import { useBackendWS } from "@/lib/usebackendWS";

// Sample draft(s)
const SAMPLE_DRAFTS: MCQ[] = [
  {
    mcqId: "m1",
    question: "Which GCP service runs containers without servers?",
    options: [
      { id: "a", text: "Cloud Run" },
      { id: "b", text: "Compute Engine" },
      { id: "c", text: "Bare metal" },
      { id: "d", text: "Filestore" },
    ],
    correctOptionId: "a",
  },
];

// 15-second rounds
const ROUND_MS = 15_000;
const BASE_SCORE = 600;
const SPEED_BONUS_MAX = 400;

type Answer = { student: string; optionId: string; respondedAtMs: number };

function LecturerSessionContent() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("sessionId") ?? "";

  const [drafts, setDrafts] = useState<MCQ[]>(SAMPLE_DRAFTS);
  const [published, setPublished] = useState<MCQ[]>([]);
  const [top, setTop] = useState<LeaderboardRow[]>([]);
  const [lastResults, setLastResults] = useState<RoundResults | null>(null);
  const [round, setRound] = useState<{
    mcq: MCQ | null;
    deadlineMs: number;
    answers: Answer[];
    ticking: boolean;
    now: number;
  }>({ mcq: null, deadlineMs: 0, answers: [], ticking: false, now: Date.now() });

  // 🔴 live transcript (mic)
  const [transcript, setTranscript] = useState<string>("");

  // 👥 Connected students tracking
  const [connectedStudents, setConnectedStudents] = useState<Array<{
    id: string;
    joinedAt: Date;
    name?: string;
  }>>([]);

  // Session configuration
  const [sessionConfig, setSessionConfig] = useState<{
    transcriptionIntervalMs?: number;
    answerTime?: number;
    questionReleaseMode?: "active" | "passive";
  }>({});

  // Question selection state
  const [questionOptions, setQuestionOptions] = useState<{
    questions: Array<{
      index: number;
      question_text: string;
      options: string[];
      correct_answer: string;
    }>;
    chunkId: string;
    transcriptChunk: string;
  } | null>(null);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((msg: any) => {
    console.log("🔔 Received WebSocket message:", msg);

    if (msg.type === "question_options") {
      setQuestionOptions({
        questions: msg.questions,
        chunkId: msg.chunk_id,
        transcriptChunk: msg.transcript_chunk
      });
    } else if (msg.type === "question_selected") {
      setQuestionOptions(null); // Close the selector
      // Could show a success toast here
    } else if (msg.type === "new_question" && msg.auto_released) {
      // Question was auto-released in passive mode
      console.log("Question auto-released to students:", msg.question);
      // Could show a notification here
    } else if (msg.type === "student_joined") {
      // Add student to connected list
      console.log("👥 Student joined:", msg);
      const newStudent = {
        id: msg.student_id,
        joinedAt: new Date(),
        name: msg.student_name || `Student ${msg.student_id.slice(-4)}`
      };
      setConnectedStudents(prev => {
        console.log("🔄 Updating connected students:", [...prev, newStudent]);
        return [...prev, newStudent];
      });
    } else if (msg.type === "student_left") {
      // Remove student from connected list
      console.log("👋 Student left:", msg);
      setConnectedStudents(prev => prev.filter(s => s.id !== msg.student_id));
    }
  }, []);

  // WebSocket connection
  const { send: sendWS, ready: wsReady } = useBackendWS(code, "lecturer", handleWebSocketMessage);

  // Fetch session configuration from URL params
  useEffect(() => {
    const sessionId = params.get("sessionId");
    const fallbackCode = params.get("code");

    const fetchSessionConfig = async (id: string) => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE || "http://localhost:8080";
        const configUrl = `${backendUrl}/sessions/${id}/config`;
        console.log("🔍 Attempting to fetch session config from:", configUrl);

        const response = await fetch(configUrl);
        console.log("📡 Fetch response status:", response.status, response.statusText);

        if (response.ok) {
          const config = await response.json();
          console.log("📋 Successfully fetched session config:", config);
          setSessionConfig({
            transcriptionIntervalMs: config.transcriptionIntervalSeconds * 1000,
            answerTime: config.answerTimeSeconds,
            questionReleaseMode: config.questionReleaseMode
          });
          console.log("✅ Session config applied to state");
        } else {
          const errorText = await response.text();
          console.error("❌ Failed to fetch session config. Status:", response.status, "Response:", errorText);
          console.error("Using defaults instead");
          setSessionConfig({
            transcriptionIntervalMs: 5 * 60 * 1000, // 5 minutes default
            answerTime: 30,
            questionReleaseMode: "active"
          });
        }
      } catch (error) {
        console.error("🚨 Network error fetching session config:", error);
        setSessionConfig({
          transcriptionIntervalMs: 5 * 60 * 1000, // 5 minutes default
          answerTime: 30,
          questionReleaseMode: "active"
        });
      }
    };

    if (sessionId) {
      // Fetch actual session configuration from backend
      fetchSessionConfig(sessionId);
    } else if (fallbackCode) {
      // Legacy support for direct code access - use fallback code as session ID
      fetchSessionConfig(fallbackCode);
    }
  }, [params]);

  // Timer tick
  useEffect(() => {
    if (!round.ticking) return;
    const id = setInterval(() => setRound((r) => ({ ...r, now: Date.now() })), 1000);
    return () => clearInterval(id);
  }, [round.ticking]);

  // Subscribe to bus
  useEffect(() => {
    if (!code) return;
    const off = bus.on((e: BusEvent) => {
      if (e.type === "answer_submitted" && e.code === code && round.mcq && e.mcqId === round.mcq.mcqId) {
        setRound((r) => {
          if (!r.mcq) return r;
          if (Date.now() > r.deadlineMs) return r;
          if (r.answers.some((a) => a.student === e.student)) return r;
          return {
            ...r,
            answers: [
              ...r.answers,
              { student: e.student, optionId: e.optionId, respondedAtMs: e.respondedAtMs },
            ],
          };
        });
      }
      if (e.type === "round_results" && e.code === code) {
        setLastResults(e.results);
      }
    });
    return () => {
      off();
    };
  }, [code, round.mcq, round.deadlineMs]);

  const codeLabel = useMemo(() => code || "N/A", [code]);

  // Mic transcript handler - sends transcript chunks via WebSocket
  const onTranscript = useCallback(
    (chunk: string) => {
      const clean = chunk.trim();
      if (!clean) return;

      console.log(`📨 [SessionPage] Received transcript chunk (${clean.length} chars)`);

      // Update local transcript display
      setTranscript((t) => (t ? t + " " + clean : clean));

      // Send transcript chunk to backend via WebSocket
      if (sendWS && wsReady) {
        console.log(`🚀 [SessionPage] Sending to backend via WebSocket`);
        sendWS({
          type: "transcript_chunk",
          chunk: clean,
          timestamp: new Date().toISOString()
        });
      } else {
        console.warn(`⚠️ [SessionPage] Cannot send - WebSocket not ready (sendWS: ${!!sendWS}, wsReady: ${wsReady})`);
      }

      // Broadcast locally for any other listeners
      bus.emit({ type: "transcript_chunk", code, text: clean, at: Date.now() } as any);
    },
    [code, sendWS, wsReady]
  );

  // Question selection handlers
  const handleQuestionSelect = useCallback(async (selectedIndex: number, chunkId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE || "http://localhost:8080";
      const response = await fetch(`${backendUrl}/select-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: code,
          selected_question_index: selectedIndex,
          chunk_id: chunkId
        })
      });

      if (response.ok) {
        console.log("Question selected successfully");
      } else {
        console.error("Failed to select question");
      }
    } catch (error) {
      console.error("Error selecting question:", error);
    }
  }, [code]);

  const handleQuestionDismiss = useCallback(() => {
    setQuestionOptions(null);
  }, []);

  const publish = useCallback(
    (mcq: MCQ) => {
      setDrafts((d) => d.filter((x) => x.mcqId !== mcq.mcqId));
      setPublished((p) => [mcq, ...p]);
      setLastResults(null);

      const now = Date.now();
      const deadlineMs = now + ROUND_MS;
      setRound({ mcq, deadlineMs, answers: [], ticking: true, now });

      const publicMcq: PublicMCQ = {
        mcqId: mcq.mcqId,
        question: mcq.question,
        options: mcq.options,
        deadlineMs,
        roundMs: ROUND_MS,
      };
      bus.emit({ type: "mcq_published", code, mcq: publicMcq });
      setTimeout(finishRound, ROUND_MS + 50);
    },
    [code]
  );

  function finishRound() {
    setRound((r) => {
      if (!r.mcq) return r;
      const correct = r.mcq.correctOptionId;

      const countsMap = new Map<string, number>();
      r.mcq.options.forEach((o) => countsMap.set(o.id, 0));
      r.answers.forEach((a) => countsMap.set(a.optionId, (countsMap.get(a.optionId) || 0) + 1));
      const counts = r.mcq.options.map((o) => ({ optionId: o.id, count: countsMap.get(o.id) || 0 }));

      const byStudent = new Map<string, number>();
      r.answers.forEach((a) => {
        const isCorrect = a.optionId === correct;
        let delta = 0;
        if (isCorrect) {
          const remaining = Math.max(0, r.deadlineMs - a.respondedAtMs);
          const bonus = Math.round((remaining / ROUND_MS) * SPEED_BONUS_MAX);
          delta = BASE_SCORE + bonus;
        }
        byStudent.set(a.student, (byStudent.get(a.student) || 0) + delta);
      });

      setTop((prev) => {
        const next = new Map<string, number>(prev.map((x) => [x.name, x.score]));
        for (const [name, delta] of byStudent.entries()) {
          next.set(name, (next.get(name) || 0) + delta);
        }
        const sorted = Array.from(next.entries())
          .map(([name, score]) => ({ name, score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
        bus.emit({ type: "leaderboard_update", code, top: sorted });
        return sorted;
      });

      const results = {
        mcqId: r.mcq.mcqId,
        counts,
        correctOptionId: correct,
        top: top,
      } satisfies RoundResults;
      bus.emit({ type: "round_results", code, results });

      return { ...r, ticking: false };
    });
  }

  function endSession() {
    if (!confirm("End session for everyone?")) return;
    bus.emit({ type: "session_ended", code });
    router.push("/lecturer");
  }

  const timeLeft = Math.max(0, round.deadlineMs - round.now);
  const secondsLeft = Math.ceil(timeLeft / 1000);
  const progressPct = round.mcq ? Math.max(0, Math.min(100, (timeLeft / ROUND_MS) * 100)) : 0;

  const startNextDraft = () => {
    if (round.ticking) return;
    if (drafts.length > 0) publish(drafts[0]);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeLabel);
    } catch {}
  };

  if (!code) {
    return (
      <p className="text-red-700">
        Missing code. Go back to <a className="underline" href="/lecturer">Start</a>.
      </p>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-6 sm:px-6 lg:px-8">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-2xl">📝</div>
          <h2 className="text-xl font-semibold tracking-tight">Live Session</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">

          {/* 🎙 Mic capture with interval-based transcription */}
          <MicCapture
            onTranscript={onTranscript}
            transcriptionIntervalMs={sessionConfig.transcriptionIntervalMs || (5 * 60 * 1000)}
          />

          <Button variant="secondary" onClick={endSession}>End session</Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {/* LEFT */}
        <div className="md:col-span-2 space-y-6">

          {/* Live round */}
          {round.mcq && (
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">⏱️ Round in progress</h3>
                  <Badge>{secondsLeft}s left</Badge>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-[width] duration-1000"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-3 font-medium">{round.mcq.question}</p>
                <p className="mt-1 text-sm text-gray-600">
                  Answers received: <b>{round.answers.length}</b>
                </p>
              </CardBody>
            </Card>
          )}

          {/* ✅ Round results (updated formatting) */}
          {lastResults && !round.ticking && (
            <Card>
              <CardBody className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">✅ Round results</h3>
                  <span className="text-xs text-gray-500">
                    Correct:{" "}
                    {round.mcq?.options.find((o) => o.id === lastResults.correctOptionId)?.text ??
                      lastResults.correctOptionId}
                  </span>
                </div>

                {/* Divider */}
                <div className="mt-3 h-px w-full bg-gray-200/70" />

                <div className="mt-4 w-full overflow-x-auto">
                  <div className="min-w-[480px]">
                    {lastResults.counts.every((c) => c.count === 0) ? (
                      <p className="text-sm text-gray-600">No answers this round.</p>
                    ) : (
                      <div className="rounded-xl border border-gray-200 bg-white/70 p-3">
                        <ColumnChart
                          height={220}
                          data={lastResults.counts.map((c) => ({
                            label:
                              (round.mcq?.options.find((o) => o.id === c.optionId)?.text ?? c.optionId) +
                              (c.optionId === lastResults.correctOptionId ? " ✓" : ""),
                            value: c.count,
                            highlight: c.optionId === lastResults.correctOptionId,
                          }))}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* 👥 Students in Session */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  👥 Students in Session
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full text-sm font-bold shadow-md">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>{connectedStudents.length} connected</span>
                  </div>
                </h3>
              </div>

              {connectedStudents.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <div className="text-3xl mb-2">🏫</div>
                  <p className="text-sm">Waiting for students to join...</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {connectedStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-100 shadow-sm"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {student.name?.charAt(0) || "S"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Joined {student.joinedAt.toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  ))}
                </div>
              )}

              {connectedStudents.length > 0 && (
                <div className="mt-4 pt-3 border-t border-green-200">
                  <div className="text-center text-xs text-slate-600">
                    <span>Total: {connectedStudents.length} students connected</span>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* 🎤 Unified Live Transcription Panel */}
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  🎤 Live Transcription
                  <Badge variant={wsReady ? "default" : "secondary"} className="ml-2">
                    {wsReady ? "🟢 Connected" : "🔴 Connecting"}
                  </Badge>
                </h3>
                {transcript && (
                  <Button variant="ghost" size="sm" onClick={() => setTranscript("")}>
                    Clear
                  </Button>
                )}
              </div>

              {/* Status Info */}
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                <span><strong>Interval:</strong> {sessionConfig.transcriptionIntervalMs ?
                  (sessionConfig.transcriptionIntervalMs < 60000 ?
                    `${Math.round(sessionConfig.transcriptionIntervalMs / 1000)}s` :
                    `${Math.round(sessionConfig.transcriptionIntervalMs / 60000)}m`
                  ) : '5m'
                } chunks</span>
                <span><strong>Status:</strong> {wsReady ? "Ready for audio" : "Connecting..."}</span>
              </div>

              {/* Live Transcript Display */}
              <div className="min-h-[100px] bg-white rounded-lg p-4 border border-slate-200">
                {transcript ? (
                  <div>
                    <div className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                      🗣️ Live transcript:
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{transcript}</p>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    <div className="text-3xl mb-2">🎙️</div>
                    <p className="text-sm">Start speaking to see live transcription...</p>
                    <p className="text-xs mt-1">Words will appear here as you speak</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* History of published questions */}
          {published.length > 0 && (
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold">🗂️ Published (history)</h3>
                <ol className="mt-3 space-y-3">
                  {published.map((mcq) => (
                    <li key={mcq.mcqId} className="rounded-xl border p-4">
                      <p className="font-medium">{mcq.question}</p>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          )}
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          {/* Session Code Card */}
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardBody className="text-center py-4">
              <div className="flex flex-col items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-700">Join Session</h3>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-mono font-bold text-indigo-600 tracking-wider">{codeLabel}</span>
                  <Button variant="ghost" size="sm" onClick={copyCode} className="p-2 h-8 w-8 text-slate-500 hover:text-slate-700">
                    📋
                  </Button>
                </div>
                <p className="text-xs text-slate-500">Students use this code to join</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">🏆 Leaderboard</h3>
                <span className="text-xs text-gray-500">Top 10</span>
              </div>
              <ol className="mt-2 space-y-1 text-sm">
                {top.length === 0 && <li className="text-gray-500">Waiting for answers…</li>}
                {top.map((t, i) => (
                  <li key={t.name} className="flex justify-between rounded-md px-2 py-1 hover:bg-gray-50">
                    <span>
                      <span className="mr-2 text-gray-500">#{i + 1}</span>
                      {t.name}
                    </span>
                    <span className="font-medium">{t.score}</span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Question Selector Modal - Only shown in active mode */}
      {questionOptions && sessionConfig.questionReleaseMode === "active" && (
        <QuestionSelector
          questions={questionOptions.questions}
          transcriptChunk={questionOptions.transcriptChunk}
          chunkId={questionOptions.chunkId}
          onQuestionSelect={handleQuestionSelect}
          onDismiss={handleQuestionDismiss}
        />
      )}
    </div>
  );
}

export default function LecturerSessionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LecturerSessionContent />
    </Suspense>
  );
}
