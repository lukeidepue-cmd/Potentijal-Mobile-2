// providers/ModeContext.tsx
//
// LEGACY SHIM. Sport modes have been removed from the app. This file exists only
// so callers that still import `useMode` / `Mode` keep compiling while the rest
// of the sport-mode code is being deleted. The hook always returns a constant
// value; `setMode` is a no-op.
//
// Delete this file once nothing imports it.

import React from "react";

export type Mode =
  | "lifting"
  | "basketball"
  | "football"
  | "baseball"
  | "soccer"
  | "hockey"
  | "tennis";

type ModeContextType = {
  mode: Mode;
  setMode: (m: Mode) => void;
  modeLoading: boolean;
};

const STUB: ModeContextType = {
  mode: "lifting",
  setMode: () => {},
  modeLoading: false,
};

export function ModeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useMode(): ModeContextType {
  return STUB;
}
