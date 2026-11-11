import fs from "node:fs";
import path from "node:path";

const contentRoot = path.resolve(process.cwd(), "../../content");

export type Language = {
  id: string; name: string; extension: string; color: string;
  level: string; hours: number; description: string; docsDomain: string;
};
export type Topic = { slug: string; title: string };
export type Stage = { stage: number; title: string; topics: Topic[] };
export type Roadmap = { language: string; stages: Stage[] };
export type Lesson = {
  id: string; language: string; topic: string; title: string; stage: number;
  order: number; explain: string; file: string; code: string;
  exercise: string; tip: string; review: string;
};
export type Resource = { title: string; url: string; type: string };
export type Challenge = {
  id: string; title: string; level: "Easy" | "Medium" | "Hard";
  function: string; prompt: string; starter: string;
  tests: { args: unknown[]; expected: unknown }[];
  topic?: string;
};
export type QuizQuestion = { id: string; language: string; question: string; options: string[]; answer: number; explanation: string };

function readJson<T>(...parts: string[]): T {
  return JSON.parse(fs.readFileSync(path.join(contentRoot, ...parts), "utf8")) as T;
}
export const getLanguages = () => readJson<Language[]>("languages.json");
export const getLanguage = (id: string) => getLanguages().find((item) => item.id === id);
export const getRoadmap = (id: string) => getLanguage(id) ? readJson<Roadmap>("roadmaps", `${id}.json`) : null;
export const getLesson = (language: string, slug: string) => {
  if (!/^[a-z0-9-]+$/.test(slug) || !getLanguage(language)) return null;
  const file = path.join(contentRoot, "lessons", language, `${slug}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) as Lesson : null;
};
export const getResources = (id: string) => getLanguage(id) ? readJson<Resource[]>("resources", `${id}.json`) : [];
export const getGeneralResources = () => readJson<Resource[]>("resources", "general.json");
const starterTopics: Record<string,string> = {
  sum:"Arrays",reverse:"Strings",capitalize:"Strings",longest:"Arrays",
  unique:"Arrays",palindrome:"Strings",fizzbuzz:"Math",flatten:"Recursion",
  chunk:"Arrays",countwords:"Strings",twosum:"Hash maps",groupby:"Hash maps",
};
export const getChallenges = () => [
  ...readJson<Challenge[]>("challenges", "javascript.json").map(challenge => ({...challenge,topic:starterTopics[challenge.id]||"Fundamentals"})),
  ...readJson<Challenge[]>("challenges", "advanced.json"),
];
export const getChallenge = (id: string) => getChallenges().find((item) => item.id === id);
export const getQuizQuestions = () => readJson<Omit<QuizQuestion,"id">[]>("quiz", "questions.json").map((question,index) => ({...question,id:`${question.language}-${index+1}`}));
export const getLessonCount = (id: string) => {
  const dir = path.join(contentRoot, "lessons", id);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith(".json")).length : 0;
};
