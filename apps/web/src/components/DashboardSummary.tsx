"use client";
import Link from "next/link";
import { useProgress } from "./ProgressClient";
import { getStreak } from "@/lib/progress";

export function DashboardSummary() {
  const progress = useProgress();
  return <div className="summary-panel"><div className="summary-title"><span>YOUR DASHBOARD</span><span className="online-dot">● Live progress</span></div><div className="summary-greeting">Keep your momentum going, <strong>{progress.name}.</strong></div><div className="summary-stats"><div><strong>{progress.completedLessons.length}</strong><span>Lessons finished</span></div><div><strong>{progress.solvedProblems.length}</strong><span>Problems solved</span></div><div><strong>{getStreak(progress.activity)}</strong><span>Day streak</span></div></div><div className="summary-progress"><span>Every small step counts</span><div><i style={{ width: `${Math.min(100, Math.max(3, progress.completedLessons.length / 1.16))}%` }} /></div></div><Link href="/profile" className="text-link">View full profile ↗</Link></div>;
}
