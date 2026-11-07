"use client";

import { useEffect, useSyncExternalStore } from "react";
import { apiGet, API_MODE } from "./client.ts";
import { createResourceStore, type Resource } from "./resource-store.ts";
import { streamEvents } from "./events.ts";

export const EVENT_INVALIDATIONS: Record<string, string[]> = {
  "plan.decided": ["/decisions", "/plans", "/site/status", "/site/bottlenecks", "/receiving", "/audit", "/notifications"],
  "plan.solved": ["/plans", "/audit"],
  "instruction.acked": ["/plans", "/audit"],
  "limits.updated": ["/limits", "/plans", "/receiving", "/notifications", "/audit"],
  "hold.created": ["/holds", "/audit", "/notifications"],
  "hold.reviewed": ["/holds", "/audit", "/notifications"],
  "lab.decided": ["/lab/results", "/lab/summary", "/receiving", "/site/status", "/audit"],
  "demand.sent": ["/supply/demand-sends", "/audit"],
  "snapshot.updated": ["/receiving", "/assets", "/production", "/site/status", "/graph", "/notifications"],
  "source.synced": ["/data-sources"],
};

export function matchInvalidation(patterns: string[], path: string): boolean {
  return patterns.some(pattern => path === pattern || path.startsWith(pattern + "/") || path.startsWith(pattern + "?"));
}

let activeRole = "planner";
let streamController: AbortController | null = null;
let onChange: (() => void) | null = null;
export function onApiEvent(callback: () => void) { onChange = callback; }
export function setActiveRole(role: string) {
  if (activeRole === role) return;
  activeRole = role;
  streamController?.abort();
  streamController = null;
  store.invalidate();
  startEventStream();
}

const store = createResourceStore(path => apiGet(path, activeRole));
const idle: Resource<never> = { loading: false };

export function invalidateResources(patterns?: string[]) {
  store.invalidate(patterns);
}

export function startEventStream() {
  if (streamController || typeof window === "undefined" || !API_MODE) return;
  const controller = new AbortController();
  streamController = controller;
  const connect = async () => {
    try {
      await streamEvents(activeRole, (event) => {
        const patterns = EVENT_INVALIDATIONS[event];
        if (patterns) store.invalidate(patterns);
        onChange?.();
      }, controller.signal);
    } catch {
      // Reconnect after brief pause
      if (!controller.signal.aborted) {
        setTimeout(connect, 3000);
      }
    }
  };
  void connect();
}

export function useResource<T>(path: string | null): { data: T | null; error: Error | null; loading: boolean; reload: () => Promise<void> } {
  const snapshot = useSyncExternalStore(
    store.subscribe,
    () => (path ? (store.snapshot(path) as Resource<T>) : (idle as Resource<T>)),
    () => (path ? (store.snapshot(path) as Resource<T>) : (idle as Resource<T>))
  );

  useEffect(() => {
    if (path && API_MODE) {
      startEventStream();
      void store.load(path);
    }
  }, [path]);

  return {
    data: snapshot.data ?? null,
    error: snapshot.error ?? null,
    loading: path ? snapshot.loading : false,
    reload: async () => {
      if (path) await store.load(path);
    },
  };
}
