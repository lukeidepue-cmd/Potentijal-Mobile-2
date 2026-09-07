// providers/TutorialContext.tsx
//
// Reactive wrapper around lib/tutorial's AsyncStorage step pointer. Lives above
// both the onboarding stack and the tabs navigator so a step change is visible
// app-wide (Home dim overlay, New Preset overlay, tab-press blocking) without an
// app restart.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getTutorialStep,
  setTutorialStep,
  type TutorialStep,
  type Rect,
} from "../lib/tutorial";

interface TutorialContextValue {
  /** Current tutorial step. 'done' means no tutorial is active. */
  step: TutorialStep;
  /** Move the tutorial to a specific step (persisted). Pass 'done' to finish. */
  setStep: (step: TutorialStep) => Promise<void>;
  /** Window-space rect of the element the active screen wants spotlighted (the
   *  preset row, the exercise box, etc.). The app-level overlay reads this to
   *  cut its hole. Screens set it as they measure and clear it on blur. */
  contentRect: Rect | null;
  setContentRect: (rect: Rect | null) => void;
}

const TutorialContext = createContext<TutorialContextValue>({
  step: "done",
  setStep: async () => {},
  contentRect: null,
  setContentRect: () => {},
});

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [step, setStepState] = useState<TutorialStep>("done");
  const [contentRect, setContentRect] = useState<Rect | null>(null);

  // Hydrate from storage once on mount.
  useEffect(() => {
    let active = true;
    getTutorialStep().then((s) => {
      if (active) setStepState(s);
    });
    return () => {
      active = false;
    };
  }, []);

  const setStep = useCallback(async (next: TutorialStep) => {
    await setTutorialStep(next);
    setStepState(next);
  }, []);

  return (
    <TutorialContext.Provider value={{ step, setStep, contentRect, setContentRect }}>
      {children}
    </TutorialContext.Provider>
  );
}

export const useTutorial = () => useContext(TutorialContext);
