import type { Metadata } from "next";
import Link from "next/link";
import { getLanguages, getLessonCount, getRoadmap } from "@/lib/content";

export const metadata: Metadata = { title: "Learning paths" };
export default function LearnPage() {
  const languages = getLanguages();
  return <main className="page-wrap"><div className="page-intro"><span className="eyebrow">STRUCTURED LEARNING</span><h1>Choose your path<span className="accent">.</span></h1><p>Start with the basics and work toward advanced concepts. Each path has five stages, practical exercises, and hand-picked resources.</p><div className="stats-inline"><span><strong>{languages.length}</strong> languages</span><span><strong>{languages.reduce((sum, lang) => sum + getLessonCount(lang.id), 0)}</strong> available lessons</span></div></div><div className="language-grid" style={{paddingBottom:80}}>{languages.map(lang => { const roadmap = getRoadmap(lang.id), count = getLessonCount(lang.id); return <Link href={`/learn/${lang.id}`} className="language-card" key={lang.id} style={{ "--language-color": lang.color } as React.CSSProperties}><div className="language-card-top"><span className="language-icon">{lang.name === "JavaScript" ? "JS" : lang.name === "TypeScript" ? "TS" : lang.name === "Python" ? "Py" : lang.name === "C++" ? "C++" : lang.name === "SQL" ? "SQL" : lang.name.slice(0, 2)}</span><span className="card-arrow">↗</span></div><h3>{lang.name}</h3><p>{lang.description}</p><div className="card-meta"><span>{count ? `${count} lessons` : "Lessons in development"} · {roadmap?.stages.length} stages</span><span>{lang.level}</span></div></Link>; })}</div></main>;
}
