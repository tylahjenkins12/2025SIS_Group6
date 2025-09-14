"use client";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

type Mode = "browser" | "server" | "ws";

export function MicCapture({
  mode = "browser",
  chunkMs = 2000,
  onTranscript,
  disabled = false,
  wsUrl = "/api/stt/ws",
  wsHeaders,
}: {
  mode?: Mode;
  chunkMs?: number;
  onTranscript?: (text: string) => void;
  disabled?: boolean;
  wsUrl?: string;
  wsHeaders?: Record<string, string>;
}) {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<"idle" | "rec" | "err">("idle");
  const [level, setLevel] = useState(0); // 0..100

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // -------- meter ----------
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

  // -------- BROWSER (Web Speech API) ----------
  const startBrowserSTT = async () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn("Web Speech API not available, falling back to WS mode.");
      return startWSSTT();
    }
    await startMedia();
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev: any) => {
      let finalChunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) finalChunk += res[0].transcript;
      }
      if (finalChunk && onTranscript) onTranscript(finalChunk.trim());
    };
    rec.onerror = (e: any) => {
      console.error("SpeechRecognition error", e);
      setStatus("err");
    };
    rec.onend = () => {
      if (recording) rec.start();
    };
    rec.start();
  };

  const stopBrowserSTT = () => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    stopMedia();
  };

  // -------- SERVER (HTTP chunk POST) ----------
  const startServerSTT = async () => {
    await startMedia();
    if (!streamRef.current) return;
    const rec = new MediaRecorder(streamRef.current, { mimeType: "audio/webm;codecs=opus", bitsPerSecond: 96_000 });
    mediaRecRef.current = rec;
    rec.ondataavailable = async (ev) => {
      if (!ev.data || ev.data.size === 0) return;
      try {
        const fd = new FormData();
        fd.append("audio", ev.data, `chunk.webm`);
        const res = await fetch("/api/stt", { method: "POST", body: fd });
        if (res.ok) {
          const json = await res.json();
          if (json.text && onTranscript) onTranscript(String(json.text));
        }
      } catch (e) {
        console.error("Upload chunk failed", e);
      }
    };
    rec.start(chunkMs);
  };

  const stopServerSTT = () => {
    try { mediaRecRef.current?.stop(); } catch {}
    mediaRecRef.current = null;
    stopMedia();
  };

  // -------- WS (WebSocket streaming) ----------
  const startWSSTT = async () => {
    await startMedia();
    if (!streamRef.current) return;

    // Build ws URL (preserve protocol)
    const url = new URL(wsUrl, window.location.origin);
    url.protocol = url.protocol.replace("http", "ws");
    const ws = new WebSocket(url.toString(), undefined);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send a small config frame if you want
      const hello = { type: "start", format: "webm/opus", sampleRate: 48000 };
      ws.send(JSON.stringify(hello));
      // Start recorder
      const rec = new MediaRecorder(streamRef.current!, { mimeType: "audio/webm;codecs=opus", bitsPerSecond: 96_000 });
      mediaRecRef.current = rec;
      rec.ondataavailable = async (ev) => {
        if (!ev.data || ev.data.size === 0) return;
        // Send raw binary to server
        const buf = await ev.data.arrayBuffer();
        if (ws.readyState === WebSocket.OPEN) ws.send(buf);
      };
      rec.start(chunkMs);
    };

    ws.onmessage = (msg) => {
      try {
        const data = typeof msg.data === "string" ? JSON.parse(msg.data) : null;
        if (data?.type === "transcript" && data.text && onTranscript) {
          onTranscript(String(data.text));
        }
      } catch (e) {
        // ignore non-JSON / provider frames if you proxy
      }
    };

    ws.onerror = (e) => {
      console.error("WS error", e);
      setStatus("err");
    };

    ws.onclose = () => {
      try { mediaRecRef.current?.stop(); } catch {}
      mediaRecRef.current = null;
      stopMedia();
    };
  };

  const stopWSSTT = () => {
    try { mediaRecRef.current?.stop(); } catch {}
    mediaRecRef.current = null;
    try { wsRef.current?.close(); } catch {}
    wsRef.current = null;
    stopMedia();
  };

  // -------- Controls ----------
  const start = async () => {
    setRecording(true);
    if (mode === "browser") await startBrowserSTT();
    else if (mode === "server") await startServerSTT();
    else await startWSSTT();
  };

  const stop = () => {
    setRecording(false);
    if (mode === "browser") stopBrowserSTT();
    else if (mode === "server") stopServerSTT();
    else stopWSSTT();
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