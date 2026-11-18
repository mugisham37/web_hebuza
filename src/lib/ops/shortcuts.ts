"use client";
// Keyboard shortcut registry for the ops console. Pages register scoped shortcuts with useShortcut();
// the "?" sheet lists whatever is currently registered. Ignored while typing in fields.
import { useEffect, useRef, useSyncExternalStore } from "react";

export type Shortcut = {
  keys: string;
  label: string;
  group: "global" | "list" | "case";
  run: () => void;
};

const registry = new Map<symbol, Shortcut>();
const listeners = new Set<() => void>();
let snapshot: Shortcut[] = [];
const emit = () => {
  snapshot = [...registry.values()];
  listeners.forEach((l) => l());
};

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

/** Normalised key of an event: "mod+k", "shift+x", "j", "?". */
const keyOf = (e: KeyboardEvent) =>
  `${e.metaKey || e.ctrlKey ? "mod+" : ""}${e.shiftKey && e.key.length === 1 && /[a-z]/i.test(e.key) ? "shift+" : ""}${e.key.toLowerCase()}`;

let chord: string | null = null;
let chordTimer: ReturnType<typeof setTimeout> | undefined;
let bound = false;
function bind() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  window.addEventListener("keydown", (e) => {
    if (typing(e.target) && !(e.metaKey || e.ctrlKey)) return;
    if (
      document.querySelector("dialog[open]") &&
      e.key !== "Escape" &&
      !(e.metaKey || e.ctrlKey)
    )
      return; // dialogs own the keyboard
    const k = keyOf(e);
    const seq = chord ? `${chord} ${k}` : k;
    const hit = [...registry.values()].find((s) => s.keys === seq);
    if (hit) {
      e.preventDefault();
      chord = null;
      hit.run();
      return;
    }
    // Start a chord ("g i") if any shortcut begins with this key.
    if (
      !chord &&
      [...registry.values()].some((s) => s.keys.startsWith(`${k} `))
    ) {
      chord = k;
      clearTimeout(chordTimer);
      chordTimer = setTimeout(() => (chord = null), 1200);
    } else chord = null;
  });
}

/** Register a shortcut while the calling component is mounted. `run` may change between renders. */
export function useShortcut(
  keys: string,
  label: string,
  run: () => void,
  group: Shortcut["group"] = "global",
  enabled = true,
) {
  const ref = useRef(run);
  useEffect(() => {
    ref.current = run;
  });
  useEffect(() => {
    if (!enabled) return;
    bind();
    const id = Symbol(keys);
    registry.set(id, { keys, label, group, run: () => ref.current() });
    emit();
    return () => {
      registry.delete(id);
      emit();
    };
  }, [keys, label, group, enabled]);
}

export const useShortcutList = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
    () => snapshot,
  );

/** "mod+k" → ["⌘","K"] / "g i" → ["G","I"] for display. */
export const displayKeys = (keys: string) =>
  keys
    .split(/[ +]/)
    .map((k) =>
      k === "mod"
        ? typeof navigator !== "undefined" && /Mac/.test(navigator.platform)
          ? "⌘"
          : "Ctrl"
        : k === "escape"
          ? "Esc"
          : k === "enter"
            ? "↵"
            : k.length === 1
              ? k.toUpperCase()
              : k,
    );
