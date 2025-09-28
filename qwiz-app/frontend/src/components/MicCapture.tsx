"use client";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

export function MicCapture({
  onTranscript,
  transcriptionIntervalMs = 10000,
  disabled = false,
}: {
  onTranscript?: (text: string) => void;
  transcriptionIntervalMs?: number;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<"idle" | "rec" | "err">("idle");
  const [level, setLevel] = useState(0); // 0..100
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptBufferRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // meter
  const startMeter = (stream: MediaStream) => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    analyserRef.current = analyser;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      // approximate RMS
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      setLevel(Math.min(100, Math.max(0, Math.round(rms * 140))));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const stopMeter = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current?.disconnect();
    audioCtxRef.current?.close();
    analyserRef.current = null;
    audioCtxRef.current = null;
    setLevel(0);
  };

  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startMeter(stream);
      setStatus("rec");
    } catch (e) {
      console.error(e);
      setStatus("err");
    }
  };

  const stopMedia = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    stopMeter();
    setStatus("idle");
  };

  // Start interval-based transcription sending
  const startTranscriptionInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const currentTranscript = transcriptBufferRef.current.trim();
      if (currentTranscript && onTranscript) {
        onTranscript(currentTranscript);
        transcriptBufferRef.current = ""; // Clear buffer after sending
      }
    }, transcriptionIntervalMs);
  };

  const stopTranscriptionInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Unified speech recognition
  const startSpeechRecognition = async () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.error("Web Speech API not available");
      setStatus("err");
      return;
    }

    await startMedia();
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (ev: any) => {
      let finalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        }
      }
      if (finalText.trim()) {
        transcriptBufferRef.current += finalText;
      }
    };

    rec.onerror = (e: any) => {
      console.error("SpeechRecognition error", e);
      setStatus("err");
    };

    rec.onend = () => {
      if (recording) rec.start(); // auto-restart if still recording
    };

    rec.start();
    startTranscriptionInterval();
  };

  const stopSpeechRecognition = () => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    stopTranscriptionInterval();

    // Send any remaining transcript
    const remainingTranscript = transcriptBufferRef.current.trim();
    if (remainingTranscript && onTranscript) {
      onTranscript(remainingTranscript);
    }
    transcriptBufferRef.current = "";

    stopMedia();
  };

  const start = async () => {
    setRecording(true);
    await startSpeechRecognition();
  };

  const stop = () => {
    setRecording(false);
    stopSpeechRecognition();
  };

  useEffect(() => () => stop(), []); // cleanup

  return (
    <div className="inline-flex items-center gap-3">
      <Button
        onClick={recording ? stop : start}
        variant={recording ? "secondary" : "primary"}
        disabled={disabled || status === "err"}
        aria-pressed={recording}
      >
        {recording ? "⏹ Stop speaking" : "🎙 Start speaking"}
      </Button>
      {/* Level meter */}
      <div className="h-2 w-28 rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-[width] duration-150"
          style={{ width: `${level}%` }}
          aria-hidden
        />
      </div>
      <span className={`text-xs ${status === "err" ? "text-red-600" : "text-slate-500"}`}>
        {status === "err" ? "Mic error" : recording ? "Listening…" : "Idle"}
      </span>
    </div>
  );
}
