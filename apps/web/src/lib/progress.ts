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
export function normalizeProgress(value: unknown): Progress {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const strings = (item: unknown) => Array.isArray(item) ? item.filter((entry): entry is string => typeof entry === "string") : [];
  const record = (item: unknown) => item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
  return {
    name: typeof data.name === "string" ? data.name.slice(0,32) : "Coder",
    completedLessons: strings(data.completedLessons),
    solvedProblems: strings(data.solvedProblems),
    bookmarkedProblems: strings(data.bookmarkedProblems),
    attempts: Object.fromEntries(Object.entries(record(data.attempts)).filter(([,n]) => typeof n === "number" && Number.isFinite(n))),
    activity: Object.fromEntries(Object.entries(record(data.activity)).filter(([,n]) => typeof n === "number" && Number.isFinite(n))),
    savedCode: Object.fromEntries(Object.entries(record(data.savedCode)).filter(([,code]) => typeof code === "string")),
    reviews: Object.fromEntries(Object.entries(record(data.reviews)).filter(([,review]) => review && typeof review === "object" && typeof (review as {due?:unknown}).due === "string")),
  } as Progress;
}
export function readProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress;
  try {
    return normalizeProgress(JSON.parse(localStorage.getItem(key) || "{}"));
  } catch { return emptyProgress; }
}
export function mergeProgress(local: Progress, remote: Progress): Progress {
  const maxRecord = (a: Record<string,number>, b: Record<string,number>) => Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].map(id=>[id,Math.max(a[id]||0,b[id]||0)]));
  const reviews = { ...remote.reviews, ...local.reviews };
  for (const [id, review] of Object.entries(remote.reviews)) {
    if ((review.attempts||0) > (local.reviews[id]?.attempts||0)) reviews[id] = review;
  }
  return {
    name: local.name !== "Coder" ? local.name : remote.name,
    completedLessons: [...new Set([...remote.completedLessons,...local.completedLessons])],
    solvedProblems: [...new Set([...remote.solvedProblems,...local.solvedProblems])],
    bookmarkedProblems: [...new Set([...remote.bookmarkedProblems,...local.bookmarkedProblems])],
    attempts: maxRecord(local.attempts,remote.attempts),
    activity: maxRecord(local.activity,remote.activity),
    savedCode: { ...remote.savedCode, ...local.savedCode },
    reviews,
  };
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
