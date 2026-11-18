"use client";
// Keeps the assistant out of the first-load public bundle (plan 11 §7.11 budget). shortcut: loads after hydration, not on first click; split launcher/panel when the budget check runs in CI.
import dynamic from "next/dynamic";

export const LazyAssistantLauncher = dynamic(() => import("@/components/organisms/booking/assistant").then((m) => m.AssistantLauncher), { ssr: false });
