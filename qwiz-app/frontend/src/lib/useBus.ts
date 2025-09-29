// lib/useBus.ts
"use client";
/**
 * React-friendly event bus adapter on top of `useBackendWS`.
 *
 * Why this file exists:
 * - Your pages already think in terms of a "bus" with `on/emit`.
 * - This adapter provides the same ergonomics, backed by the server WS.
 * - Multiple listeners are supported (Set of handlers).
 */

import { useMemo, useRef } from "react";
import { useBackendWS, type Msg } from "@/lib/usebackendWS";
// Reuse your existing event types so UI code remains strongly typed.
import type { BusEvent } from "@/types";

export type Unsub = () => void;

export interface Bus {
  /** Subscribe to all inbound events (filtered in the page by e.code if needed) */
  on(fn: (e: BusEvent) => void): Unsub;
  /** Emit an outbound event to the backend (server decides how to route) */
  emit(e: BusEvent): void;
  /** Socket readiness for UX nudges (optional) */
  ready: boolean;
}

/**
 * Create a bus bound to a session and role.
 * Example:
 *   const bus = useBus({ sessionId: code, role: "student", name });
 *   useEffect(() => bus.on(handleEvent), [bus]);
 *   bus.emit({ type:"answer_submitted", code, mcqId, optionId, student, respondedAtMs });
 */
export function useBus(ctx: {
  sessionId: string;
  role: "lecturer" | "student";
  name?: string;
}): Bus {
  // Local listener registry. Pages can register multiple handlers safely.
  const listenersRef = useRef(new Set<(e: BusEvent) => void>());

  // Inbound WS messages → fan out to listeners
  const handleIncoming = (msg: Msg) => {
    // You already use discriminated unions like { type: "round_results", code, ... }
    // We assume all server frames are BusEvent-shaped JSON.
    listenersRef.current.forEach((fn) => {
      try {
        fn(msg as unknown as BusEvent);
      } catch {
        /* isolate listener failures */
      }
    });
  };

  // One WS connection scoped to {sessionId, role, name}
  const { send, ready } = useBackendWS(ctx.sessionId, ctx.role, handleIncoming, {
    name: ctx.name,
  });

  // Emit just serializes an event and hands it to the WS.
  const emit = (e: BusEvent) => {
    // TIP: include `code` on all events so the backend can route to the room.
    send(e as unknown as Msg);
  };

  // Stable object identity across renders, with live `ready` flag
  return useMemo<Bus>(
    () => ({
      on(fn) {
        listenersRef.current.add(fn);
        return () => listenersRef.current.delete(fn);
      },
      emit,
      ready,
    }),
    [ready]
  );
}
