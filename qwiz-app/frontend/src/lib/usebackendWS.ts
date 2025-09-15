"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Msg = Record<string, any>;

export function useBackendWS(
  sessionId: string,
  clientType: "lecturer" | "student",
  onMessage?: (msg: Msg) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const base = process.env.NEXT_PUBLIC_BACKEND_WS_BASE || "http://localhost:8080";
    const url = new URL(`/ws/${clientType}/${sessionId}`, base);
    url.protocol = url.protocol.replace("http", "ws");

    const ws = new WebSocket(url.toString());
    wsRef.current = ws;

    ws.onopen = () => setReady(true);
    ws.onclose = () => setReady(false);
    ws.onerror = () => setReady(false);
    ws.onmessage = (e) => {
      try {
        const msg = typeof e.data === "string" ? JSON.parse(e.data) : null;
        if (msg && onMessage) onMessage(msg);
      } catch {
        /* ignore non-JSON frames */
      }
    };

    return () => {
      try { ws.close(); } catch {}
      wsRef.current = null;
    };
  }, [sessionId, clientType, onMessage]);

  const send = useCallback((msg: Msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, []);

  return { send, ready };
}
