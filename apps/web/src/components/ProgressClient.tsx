"use client";

import { useEffect, useState } from "react";
import { emptyProgress, readProgress, type Progress } from "@/lib/progress";

export function useProgress(): Progress {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  useEffect(() => {
    const sync = () => setProgress(readProgress());
    sync();
    window.addEventListener("devoal-progress", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("devoal-progress", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return progress;
}
