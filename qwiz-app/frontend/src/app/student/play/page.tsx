"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { LeaderboardRow, PublicMCQ, RoundResults } from "@/types";
import { Card, CardBody, Button } from "@/components/ui";
import { ColumnChart } from "@/components/Chart";
import { useBackendWS } from "@/lib/usebackendWS";

const OVERLAY_MS = 3500;

export default function StudentPlayPage() {
  const router = useRouter();
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use state to avoid hydration errors - only set after client mount
  const [code, setCode] = useState("");
  const [name, setName] = useState("Anon");
  const [mounted, setMounted] = useState(false);

  // Set values from sessionStorage only on client side after mount
  useEffect(() => {
    setCode(sessionStorage.getItem("mvp_code") ?? "");
    setName(sessionStorage.getItem("mvp_name") ?? "Anon");
    setMounted(true);

    // Cleanup timer on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, []);

  const [current, setCurrent] = useState<PublicMCQ | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [results, setResults] = useState<RoundResults | null>(null);
  const [top, setTop] = useState<LeaderboardRow[]>([]);
  const [showFullLB, setShowFullLB] = useState(false);
  const [sessionResults, setSessionResults] = useState<any | null>(null);

  // helper to close overlay
  const hideOverlay = useCallback(() => setShowFullLB(false), []);

  // close overlay on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideOverlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hideOverlay]);

  // Countdown ticker with progress bar
  const tickCountdown = useCallback((deadlineMs: number, roundMs: number) => {
    // Clear any existing timer first
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const update = () => {
      const remaining = Math.max(0, deadlineMs - Date.now());
      setSecondsLeft(Math.ceil(remaining / 1000));
      setProgressPct(Math.max(0, Math.min(100, (remaining / roundMs) * 100)));
      if (remaining <= 0 && timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
    update();
    timerIntervalRef.current = setInterval(update, 1000); // Changed to 1 second for smoother updates
  }, []);

  // WebSocket message handler for backend communication
  const handleWebSocketMessage = useCallback((msg: any) => {
    if (msg.type === "new_question") {
      console.log("📨 Received new question:", msg);

      // Get answer time from the message (sent separately from question object)
      const answerTimeSeconds = msg.answerTimeSeconds || msg.question?.answer_time_seconds || 30;

      // Convert backend question format to PublicMCQ format
      const publicMcq: PublicMCQ = {
        mcqId: msg.question.id,
        question: msg.question.questionText || msg.question.question_text,
        options: msg.question.options.map((opt: string, idx: number) => ({
          id: String.fromCharCode(97 + idx), // a, b, c, d
          text: opt
        })),
        deadlineMs: Date.now() + (answerTimeSeconds * 1000),
        roundMs: answerTimeSeconds * 1000
      };

      console.log("✅ Question parsed. Timer:", answerTimeSeconds, "seconds");

      setCurrent(publicMcq);
      setPicked(null);
      setResults(null);
      setShowFullLB(false);
      tickCountdown(publicMcq.deadlineMs, publicMcq.roundMs);
    } else if (msg.type === "answer_result") {
      // Handle answer feedback from backend
      console.log("Answer result:", msg);
    } else if (msg.type === "leaderboard_update") {
      // Handle leaderboard updates from backend
      console.log("📊 Leaderboard update:", msg.leaderboard);
      if (msg.leaderboard && msg.leaderboard.students) {
        const leaderboardData = msg.leaderboard.students.map((student: any) => ({
          name: student.student_id, // We'll use student_id as name for now
          score: student.score
        }));
        setTop(leaderboardData);
      }
    } else if (msg.type === "session_ended") {
      // Handle session end - find this student's results
      console.log("🏁 Session ended. All results:", msg.all_results);

      // Find this student's results by name
      if (msg.all_results) {
        const myResults = msg.all_results[name];
        if (myResults) {
          console.log("📊 My results:", myResults);
          setSessionResults(myResults);
          // Clear current question and show results
          setCurrent(null);
          setPicked(null);
          setResults(null);
          setShowFullLB(false);
          // Clear timer
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
        } else {
          console.warn("⚠️ Could not find results for student:", name);
        }
      }
    }
  }, [code, tickCountdown, name]);


  // WebSocket connection for real-time communication with backend
  const { send: sendWS, ready: wsReady } = useBackendWS(code, "student", handleWebSocketMessage);

  // Send student name once WebSocket is ready
  useEffect(() => {
    if (wsReady && sendWS && name) {
      console.log("🎓 Sending student name to backend:", name);
      sendWS({
        type: "student_name",
        name: name
      });
    }
  }, [wsReady, sendWS, name]);

  // Auto-hide question when time runs out
  useEffect(() => {
    if (current && secondsLeft <= 0) {
      // Wait a moment to show "time's up" state, then clear the question
      const timeout = setTimeout(() => {
        setCurrent(null);
        setPicked(null);
      }, 2000); // 2 second delay before hiding
      return () => clearTimeout(timeout);
    }
  }, [current, secondsLeft]);

  function submit(optionId: string) {
    if (!current || picked || secondsLeft <= 0) return;
    setPicked(optionId);

    // Send answer via WebSocket to backend
    if (sendWS && wsReady) {
      const responseTimeMs = current.deadlineMs - Date.now();
      sendWS({
        type: "answer_submission",
        data: {
          question_id: current.mcqId,
          selected_option: current.options.find(opt => opt.id === optionId)?.text || "",
          response_time_ms: Math.max(0, current.roundMs - responseTimeMs)
        }
      });
    }
  }

  function leaveSession() {
    if (!confirm("Leave this session? You can rejoin with the code.")) return;
    try {
      sessionStorage.removeItem("mvp_code");
      sessionStorage.removeItem("mvp_name");
    } catch {}
    router.push("/student");
  }

  if (!code)
    return <p className="text-red-700">No session code — go back and join.</p>;

  // Session Results View (shown when session ends)
  if (sessionResults) {
    const rankEmoji = sessionResults.final_rank === 1 ? "🥇" : sessionResults.final_rank === 2 ? "🥈" : sessionResults.final_rank === 3 ? "🥉" : "🎯";

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 pt-20 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Session Ended</h1>
            <p className="text-lg text-gray-600">Final Results for {sessionResults.student_name}</p>
          </div>

          {/* Rank Card */}
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardBody className="p-8 text-center">
              <div className="text-6xl mb-4">{rankEmoji}</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Rank #{sessionResults.final_rank} of {sessionResults.total_students}
              </h2>
              <p className="text-2xl text-gray-700 mb-1">
                Final Score: <span className="font-bold text-indigo-600">{sessionResults.final_score}</span> points
              </p>
              <p className="text-lg text-gray-600">
                {sessionResults.correct_answers} / {sessionResults.total_answers} correct
                {sessionResults.total_answers > 0 &&
                  ` (${Math.round((sessionResults.correct_answers / sessionResults.total_answers) * 100)}%)`
                }
              </p>
            </CardBody>
          </Card>

          {/* Question Results */}
          <Card>
            <CardBody className="p-6">
              <h3 className="text-xl font-semibold mb-4">Question Review</h3>
              {sessionResults.question_results && sessionResults.question_results.length > 0 ? (
                <div className="space-y-4">
                  {sessionResults.question_results.map((qr: any, idx: number) => (
                    <div
                      key={qr.question_id || idx}
                      className={`p-4 rounded-lg border-2 ${
                        qr.is_correct
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-gray-900 flex-1">
                          {idx + 1}. {qr.question_text}
                        </p>
                        <span className="text-2xl ml-2">
                          {qr.is_correct ? '✅' : '❌'}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="text-gray-700">
                          <span className="font-semibold">Your answer:</span> {qr.student_answer}
                        </p>
                        {!qr.is_correct && (
                          <p className="text-gray-700">
                            <span className="font-semibold">Correct answer:</span> {qr.correct_answer}
                          </p>
                        )}
                        {qr.points_earned > 0 && (
                          <p className="text-green-700 font-semibold">
                            +{qr.points_earned} points
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No questions answered in this session.</p>
              )}
            </CardBody>
          </Card>

          {/* Leave Button */}
          <div className="mt-6 text-center">
            <Button onClick={leaveSession} variant="primary">
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Fullscreen Leaderboard overlay
  const FullscreenLeaderboard = () => (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
      onClick={hideOverlay}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="pointer-events-auto absolute left-1/2 top-1/2 w-[min(100%,900px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">🏆 Leaderboard</h2>
          <Button variant="ghost" onClick={hideOverlay} aria-label="Close leaderboard">
            Close
          </Button>
        </div>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {/* Top-10 list */}
          <div>
            <ol className="space-y-1 text-sm">
              {top.slice(0, 10).map((t, i) => (
                <li
                  key={t.name}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    t.name === name ? "bg-indigo-50" : "bg-transparent"
                  }`}
                >
                  <span className="truncate">
                    <span className="mr-2 text-gray-500">#{i + 1}</span>
                    <b className={t.name === name ? "text-indigo-700" : ""}>{t.name}</b>
                  </span>
                  <span className="font-medium">{t.score}</span>
                </li>
              ))}
              {top.length === 0 && (
                <li className="text-gray-500">Waiting for scores…</li>
              )}
            </ol>
          </div>

          {/* Chart: how close everyone is */}
          <div className="rounded-xl border border-gray-200 bg-white/70 p-3">
            <ColumnChart
              height={240}
              data={(top.length ? top : []).slice(0, 10).map((t) => ({
                label: t.name === name ? `${t.name} (you)` : t.name,
                value: t.score,
                highlight: t.name === name,
              }))}
            />
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Showing top 10 for a moment… resuming quiz view.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 pt-20 pb-12 sm:px-6 lg:px-8">
      {/* Overlay */}
      {showFullLB && <FullscreenLeaderboard />}

      {/* Top bar: identity + leave */}
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm">
          You are <b>{name}</b> in session <b>{code}</b>
        </div>
        <Button variant="secondary" onClick={leaveSession}>
          Leave session
        </Button>
      </div>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Waiting state */}
          {!current && !results && (
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold">🎤 Waiting for the next question…</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Hang tight—your lecturer will release a question soon. Keep this tab open.
                </p>
              </CardBody>
            </Card>
          )}

          {/* Live round */}
          {current && (
            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">{current.question}</h3>

                  {/* Enhanced timer display */}
                  <div className={[
                    "flex items-center gap-2 px-4 py-2 rounded-2xl shadow-lg font-bold text-lg transition-all duration-300",
                    secondsLeft <= 5 ? "bg-gradient-to-r from-red-500 to-orange-500 text-white animate-pulse" :
                    secondsLeft <= 10 ? "bg-gradient-to-r from-orange-400 to-yellow-400 text-white" :
                    "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                  ].join(" ")}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="min-w-[3rem] text-center">{secondsLeft}s</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-6 h-3 w-full overflow-hidden rounded-full bg-gray-200 shadow-inner">
                  <div
                    className={[
                      "h-full transition-all duration-300",
                      secondsLeft <= 5 ? "bg-gradient-to-r from-red-500 to-orange-500" :
                      secondsLeft <= 10 ? "bg-gradient-to-r from-orange-400 to-yellow-400" :
                      "bg-gradient-to-r from-indigo-500 to-purple-500"
                    ].join(" ")}
                    style={{ width: `${progressPct}%` }}
                    aria-hidden
                  />
                </div>

                {/* Status message - moved above options for better visibility */}
                {picked && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg border-2 border-green-400">
                    <p className="font-bold text-center flex items-center justify-center gap-2">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Answer Submitted! Waiting for other students...
                    </p>
                  </div>
                )}

                <ul className="space-y-3">
                  {current.options.map((o, idx) => {
                    const isPicked = picked === o.id;
                    const isDisabled = !!picked || secondsLeft <= 0;

                    // Color schemes for each option
                    const colorSchemes = [
                      { // A - Blue
                        border: "border-blue-300",
                        bg: "bg-blue-50",
                        hover: "hover:bg-blue-100",
                        label: "bg-blue-500",
                        picked: "border-blue-500 bg-blue-100 ring-2 ring-blue-300"
                      },
                      { // B - Green
                        border: "border-green-300",
                        bg: "bg-green-50",
                        hover: "hover:bg-green-100",
                        label: "bg-green-500",
                        picked: "border-green-500 bg-green-100 ring-2 ring-green-300"
                      },
                      { // C - Orange
                        border: "border-orange-300",
                        bg: "bg-orange-50",
                        hover: "hover:bg-orange-100",
                        label: "bg-orange-500",
                        picked: "border-orange-500 bg-orange-100 ring-2 ring-orange-300"
                      },
                      { // D - Purple
                        border: "border-purple-300",
                        bg: "bg-purple-50",
                        hover: "hover:bg-purple-100",
                        label: "bg-purple-500",
                        picked: "border-purple-500 bg-purple-100 ring-2 ring-purple-300"
                      }
                    ];

                    const colors = colorSchemes[idx] || colorSchemes[0];

                    return (
                      <li key={o.id}>
                        <button
                          onClick={() => submit(o.id)}
                          disabled={isDisabled}
                          className={[
                            "w-full rounded-xl border-2 px-4 py-4 text-left shadow-md transition-all duration-200 flex items-center gap-3",
                            "focus:outline-none focus:ring-2 focus:ring-offset-2",
                            isDisabled ? "cursor-not-allowed opacity-60" : colors.hover,
                            isPicked ? colors.picked : `${colors.border} ${colors.bg}`,
                          ].join(" ")}
                        >
                          {/* Option letter badge */}
                          <div className={`${colors.label} text-white font-bold text-sm w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            {o.id.toUpperCase()}
                          </div>

                          {/* Option text */}
                          <span className="flex-1 font-medium text-slate-700">
                            {o.text}
                          </span>

                          {/* Checkmark for picked answer */}
                          {isPicked && (
                            <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          )}

          {/* Results */}
          {results && (
            <Card>
              <CardBody className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Class results</h3>
                    <p className="text-sm text-gray-600">
                      Number of students who chose each option
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    Correct: <b>{results.correctOptionId.toUpperCase()}</b>
                  </div>
                </div>

                {/* Divider */}
                <div className="mt-3 h-px w-full bg-gray-200/70" />

                <div className="mt-4 rounded-xl border border-gray-200 bg-white/70 p-3">
                  <ColumnChart
                    height={220}
                    data={results.counts.map((c) => ({
                      label: c.optionId.toUpperCase(),
                      value: c.count,
                      // highlight correct answer
                      highlight: c.optionId === results.correctOptionId,
                    }))}
                  />
                </div>

                {/* Personal feedback */}
                {picked && (
                  <p className="mt-3 text-sm">
                    Your answer:{" "}
                    <b>{picked.toUpperCase()}</b>{" "}
                    {picked === results.correctOptionId ? (
                      <span className="text-green-600">✅ Correct</span>
                    ) : (
                      <span className="text-red-600">❌ Incorrect</span>
                    )}
                  </p>
                )}

                {/* CTA: show overlay again */}
                <div className="mt-4">
                  <Button variant="ghost" onClick={() => setShowFullLB(true)}>
                    View full leaderboard
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar: leaderboard only (identity moved to top bar) */}
        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold">Leaderboard</h3>
              <ol className="mt-2 space-y-1 text-sm">
                {top.length === 0 && (
                  <li className="text-gray-500">Waiting for updates…</li>
                )}
                {top.map((t, i) => (
                  <li
                    key={t.name}
                    className={`flex justify-between rounded-md px-2 py-1 hover:bg-gray-50 ${
                      t.name === name ? "bg-indigo-50" : ""
                    }`}
                  >
                    <span className="truncate">
                      <span className="mr-2 text-gray-500">#{i + 1}</span>
                      <b className={t.name === name ? "text-indigo-700" : ""}>{t.name}</b>
                    </span>
                    <span className="font-medium">{t.score}</span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  );
}
