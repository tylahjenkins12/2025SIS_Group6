import type { BusEvent } from "@/types";

type Listener = (e: BusEvent) => void;

const isBrowser = typeof window !== "undefined"; // runtime guard
const w = (isBrowser ? (window as Window & typeof globalThis) : undefined);

class MVPBus {
  private channel?: BroadcastChannel;
  private lsKey = "__mvp_bus__";
  private listeners = new Set<Listener>();

  constructor() {
    if (!isBrowser) return; // do nothing on the server

    // Prefer BroadcastChannel when available
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel("mvp-session");
      this.channel.onmessage = (msg) => this.emitLocal(msg.data as BusEvent);
    } else {
      // Fallback: listen for cross-tab storage events
      w?.addEventListener("storage", (e: StorageEvent) => {
        if (e.key !== this.lsKey || !e.newValue) return;
        try {
          this.emitLocal(JSON.parse(e.newValue) as BusEvent);
        } catch {
          /* ignore bad JSON */
        }
      });
    }
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(e: BusEvent) {
    if (this.channel) {
      this.channel.postMessage(e);
    } else if (isBrowser) {
      // storage-event fallback (fires in other tabs)
      localStorage.setItem(this.lsKey, JSON.stringify(e));
    }
    // deliver to current tab too
    this.emitLocal(e);
  }

  private emitLocal(e: BusEvent) {
    this.listeners.forEach((fn) => fn(e));
  }
}

export const bus = new MVPBus();
