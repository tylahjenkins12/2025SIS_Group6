"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, Button, Badge } from "@/components/ui";
import { MicCapture } from "@/components/MicCapture";
import { useBackendWS } from "@/lib/usebackendWS";

interface TestResult {
  name: string;
  status: "pending" | "success" | "error";
  message: string;
  timestamp?: string;
}

interface SessionCreateResponse {
  sessionId: string;
  lecturerName: string;
  courseName: string;
  questionInterval: number;
  answerTime: number;
  transcriptionInterval: number;
}

export default function TestConnectionPage() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: "Backend Health Check", status: "pending", message: "Not tested" },
    { name: "Session Creation", status: "pending", message: "Not tested" },
    { name: "WebSocket Connection", status: "pending", message: "Not tested" },
    { name: "WebSocket Messaging", status: "pending", message: "Not tested" },
    { name: "Speech Recognition", status: "pending", message: "Not tested" },
    { name: "Transcription to Backend", status: "pending", message: "Not tested" },
  ]);

  const [sessionId, setSessionId] = useState<string>("");
  const [transcriptMessages, setTranscriptMessages] = useState<string[]>([]);
  const [isTestingMic, setIsTestingMic] = useState(false);

  // WebSocket connection (only if we have a sessionId)
  const { send: sendWS, ready: wsReady } = useBackendWS(sessionId, "lecturer", (message) => {
    if (message.type === "transcript_received") {
      setTranscriptMessages(prev => [...prev, `✅ Backend acknowledged: ${message.chunk_length} chars at ${message.timestamp}`]);
      updateTest("Transcription to Backend", "success", `Successfully sent and received acknowledgment`);
    }
  });

  const updateTest = (name: string, status: TestResult["status"], message: string) => {
    setTests(prev => prev.map(test =>
      test.name === name
        ? { ...test, status, message, timestamp: new Date().toLocaleTimeString() }
        : test
    ));
  };

  // Test 1: Backend Health Check
  const testBackendHealth = async () => {
    updateTest("Backend Health Check", "pending", "Testing...");
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE || "http://localhost:8080";
      const response = await fetch(`${backendUrl}/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (response.ok) {
        const data = await response.json();
        updateTest("Backend Health Check", "success", `✅ Backend responded: ${data.status}`);
      } else {
        updateTest("Backend Health Check", "error", `❌ HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      updateTest("Backend Health Check", "error", `❌ Connection failed: ${error}`);
    }
  };

  // Test 2: Session Creation
  const testSessionCreation = async () => {
    updateTest("Session Creation", "pending", "Creating test session...");
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE || "http://localhost:8080";
      const response = await fetch(`${backendUrl}/start-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lecturer_name: "Test Lecturer",
          course_name: "Connection Test Course",
          question_interval_seconds: 30,
          answer_time_seconds: 30,
          transcription_interval_seconds: 10
        })
      });

      if (response.ok) {
        const data: SessionCreateResponse = await response.json();
        setSessionId(data.sessionId);
        updateTest("Session Creation", "success", `✅ Session created: ${data.sessionId}`);

        // Auto-start WebSocket test
        setTimeout(() => testWebSocketConnection(), 1000);
      } else {
        const errorText = await response.text();
        updateTest("Session Creation", "error", `❌ HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      updateTest("Session Creation", "error", `❌ Request failed: ${error}`);
    }
  };

  // Test 3: WebSocket Connection
  const testWebSocketConnection = () => {
    updateTest("WebSocket Connection", "pending", "Connecting...");
    if (!sessionId) {
      updateTest("WebSocket Connection", "error", "❌ No session ID available");
      return;
    }
    // The connection status will be updated by the useEffect below
  };

  // Test 4: WebSocket Messaging
  const testWebSocketMessaging = () => {
    updateTest("WebSocket Messaging", "pending", "Sending test message...");
    if (!wsReady || !sendWS) {
      updateTest("WebSocket Messaging", "error", "❌ WebSocket not ready");
      return;
    }

    try {
      sendWS({
        type: "transcript_chunk",
        chunk: "This is a test transcript chunk from the connection tester.",
        timestamp: new Date().toISOString()
      });
      updateTest("WebSocket Messaging", "success", "✅ Test message sent, waiting for acknowledgment...");
    } catch (error) {
      updateTest("WebSocket Messaging", "error", `❌ Failed to send: ${error}`);
    }
  };

  // Test 5: Speech Recognition
  const testSpeechRecognition = () => {
    updateTest("Speech Recognition", "pending", "Testing browser speech recognition...");

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      updateTest("Speech Recognition", "error", "❌ Web Speech API not available in this browser");
      return;
    }

    try {
      const rec = new SR();
      rec.lang = "en-US";

      rec.onstart = () => {
        updateTest("Speech Recognition", "success", "✅ Speech recognition started successfully");
        setTimeout(() => rec.stop(), 2000); // Stop after 2 seconds
      };

      rec.onerror = (e: any) => {
        updateTest("Speech Recognition", "error", `❌ Speech recognition error: ${e.error}`);
      };

      rec.start();
    } catch (error) {
      updateTest("Speech Recognition", "error", `❌ Failed to start: ${error}`);
    }
  };

  // Monitor WebSocket connection status
  useEffect(() => {
    if (sessionId && tests.find(t => t.name === "WebSocket Connection")?.status === "pending") {
      if (wsReady) {
        updateTest("WebSocket Connection", "success", "✅ WebSocket connected successfully");
        // Auto-start messaging test
        setTimeout(() => testWebSocketMessaging(), 1000);
      }
    }
  }, [wsReady, sessionId]);

  // Handle transcription from MicCapture
  const onTranscript = useCallback((chunk: string) => {
    if (!wsReady || !sendWS) {
      updateTest("Transcription to Backend", "error", "❌ WebSocket not ready for transcription");
      return;
    }

    setTranscriptMessages(prev => [...prev, `📝 Sending: "${chunk}"`]);

    try {
      sendWS({
        type: "transcript_chunk",
        chunk: chunk,
        timestamp: new Date().toISOString()
      });
      updateTest("Transcription to Backend", "pending", "Transcription sent, waiting for backend response...");
    } catch (error) {
      updateTest("Transcription to Backend", "error", `❌ Failed to send transcription: ${error}`);
    }
  }, [sendWS, wsReady]);

  // Run all tests
  const runAllTests = async () => {
    setTranscriptMessages([]);
    await testBackendHealth();
    setTimeout(testSessionCreation, 1000);
    setTimeout(testSpeechRecognition, 2000);
  };

  const getStatusColor = (status: TestResult["status"]) => {
    switch (status) {
      case "success": return "text-green-600";
      case "error": return "text-red-600";
      case "pending": return "text-yellow-600";
      default: return "text-gray-600";
    }
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success": return "✅";
      case "error": return "❌";
      case "pending": return "⏳";
      default: return "⚪";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <Card>
          <CardBody>
            <h1 className="text-2xl font-bold">🔧 Backend Connection Test</h1>
            <p className="mt-2 text-slate-600">
              Comprehensive test suite to verify frontend-backend integration
            </p>
            <div className="mt-4 flex gap-3">
              <Button onClick={runAllTests}>
                🚀 Run All Tests
              </Button>
              <Badge variant={wsReady ? "default" : "secondary"}>
                {wsReady ? "🟢 WebSocket Connected" : "🔴 WebSocket Disconnected"}
              </Badge>
            </div>
          </CardBody>
        </Card>

        {/* Test Results */}
        <Card>
          <CardBody>
            <h2 className="text-xl font-semibold mb-4">📊 Test Results</h2>
            <div className="space-y-3">
              {tests.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getStatusIcon(test.status)}</span>
                    <div>
                      <div className="font-medium">{test.name}</div>
                      <div className={`text-sm ${getStatusColor(test.status)}`}>
                        {test.message}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {test.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Individual Test Controls */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold mb-3">🌐 API Tests</h3>
              <div className="space-y-2">
                <Button variant="ghost" onClick={testBackendHealth} className="w-full justify-start">
                  Test Health Endpoint
                </Button>
                <Button variant="ghost" onClick={testSessionCreation} className="w-full justify-start">
                  Test Session Creation
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold mb-3">🔌 WebSocket Tests</h3>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  onClick={testWebSocketConnection}
                  disabled={!sessionId}
                  className="w-full justify-start"
                >
                  Test WebSocket Connection
                </Button>
                <Button
                  variant="ghost"
                  onClick={testWebSocketMessaging}
                  disabled={!wsReady}
                  className="w-full justify-start"
                >
                  Test WebSocket Messaging
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Transcription Test */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold mb-3">🎤 Transcription Test</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <MicCapture
                  onTranscript={onTranscript}
                  transcriptionIntervalMs={5000}
                  disabled={!wsReady}
                />
                <div className="text-sm text-slate-600">
                  {wsReady ? "Ready to test transcription" : "WebSocket must be connected first"}
                </div>
              </div>

              {transcriptMessages.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">📝 Transcription Log:</h4>
                  <div className="space-y-1 text-sm font-mono">
                    {transcriptMessages.map((msg, idx) => (
                      <div key={idx} className="text-gray-700">{msg}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Environment Info */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold mb-3">⚙️ Environment Configuration</h3>
            <div className="grid gap-2 text-sm font-mono">
              <div>
                <strong>Backend API:</strong> {process.env.NEXT_PUBLIC_BACKEND_API_BASE || "http://localhost:8080"}
              </div>
              <div>
                <strong>Backend WebSocket:</strong> {process.env.NEXT_PUBLIC_BACKEND_WS_BASE || "ws://localhost:8080"}
              </div>
              <div>
                <strong>Session ID:</strong> {sessionId || "Not created yet"}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}