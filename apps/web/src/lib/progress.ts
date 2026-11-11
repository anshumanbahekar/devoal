export type Progress = {
  name: string;
  completedLessons: string[];
  solvedProblems: string[];
  bookmarkedProblems: string[];
  attempts: Record<string, number>;
  activity: Record<string, number>;
  savedCode: Record<string, string>;
  reviews: Record<string, { due: string; interval: number; correct: number; attempts: number }>;
};
export const emptyProgress: Progress = {
  name: "Coder", completedLessons: [], solvedProblems: [], bookmarkedProblems: [],
  attempts: {}, activity: {}, savedCode: {}, reviews: {},
};
const key = "devoal.progress.v1";
export function readProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress;
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      name: typeof value.name === "string" ? value.name : "Coder",
      completedLessons: Array.isArray(value.completedLessons) ? value.completedLessons : [],
      solvedProblems: Array.isArray(value.solvedProblems) ? value.solvedProblems : [],
      bookmarkedProblems: Array.isArray(value.bookmarkedProblems) ? value.bookmarkedProblems : [],
      attempts: value.attempts && typeof value.attempts === "object" ? value.attempts : {},
      activity: value.activity && typeof value.activity === "object" ? value.activity : {},
      savedCode: value.savedCode && typeof value.savedCode === "object" ? value.savedCode : {},
      reviews: value.reviews && typeof value.reviews === "object" ? value.reviews : {},
    };
  } catch { return emptyProgress; }
}
export function answerReview(current: Progress, id: string, correct: boolean): Progress {
  const previous = current.reviews[id];
  const interval = correct ? Math.min(previous?.interval ? previous.interval * 2 : 1, 64) : 1;
  const due = new Date();
  due.setDate(due.getDate() + interval);
  return markActivity({
    ...current,
    reviews: {
      ...current.reviews,
      [id]: { due: due.toLocaleDateString("en-CA"), interval, correct: (previous?.correct || 0) + Number(correct), attempts: (previous?.attempts || 0) + 1 },
    },
  });
}
export function dueReviewIds(progress: Progress, today = new Date().toLocaleDateString("en-CA")): string[] {
  return Object.entries(progress.reviews).filter(([, review]) => review.due <= today).map(([id]) => id);
}
export function updateProgress(change: (current: Progress) => Progress): Progress {
  const next = change(readProgress());
  localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new Event("devoal-progress"));
  return next;
}
export function markActivity(current: Progress): Progress {
  const day = new Date().toLocaleDateString("en-CA");
  return { ...current, activity: { ...current.activity, [day]: (current.activity[day] || 0) + 1 } };
}
export function getStreak(activity: Record<string, number>): number {
  let days = 0;
  const date = new Date();
  if (!activity[date.toLocaleDateString("en-CA")]) date.setDate(date.getDate() - 1);
  while (activity[date.toLocaleDateString("en-CA")]) {
    days++;
    date.setDate(date.getDate() - 1);
  }
  return days;
}
