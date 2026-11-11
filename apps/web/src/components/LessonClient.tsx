"use client";
import Link from "next/link";
import { useProgress } from "./ProgressClient";
import { markActivity, updateProgress } from "@/lib/progress";
import type { Lesson } from "@/lib/content";
import { Tutor } from "./Tutor";

export function LessonClient({lesson,languageName,next}:{lesson:Lesson;languageName:string;next:string|null}) {
  const progress=useProgress();const done=progress.completedLessons.includes(lesson.id);
  function complete(){updateProgress(current=>markActivity({...current,completedLessons:current.completedLessons.includes(lesson.id)?current.completedLessons:[...current.completedLessons,lesson.id]}));}
  return <article className="content-panel"><span className="lesson-label">{languageName.toUpperCase()} / LESSON {String(lesson.order).padStart(2,"0")}</span><h2>{lesson.title}</h2><p>{lesson.explain}</p><div className="lesson-label" style={{marginTop:28}}>EXAMPLE · {lesson.file}</div><pre className="lesson-code"><code>{lesson.code}</code></pre><div className="callout"><strong>TRY IT YOURSELF</strong><p>{lesson.exercise}</p></div><div className="callout" style={{background:"#1d2229",borderColor:"#80b9ee"}}><strong style={{color:"#80b9ee"}}>A USEFUL TIP</strong><p>{lesson.tip}</p></div><Tutor context={`Lesson: ${lesson.title} (${languageName}). Explanation: ${lesson.explain}. Exercise: ${lesson.exercise}. Tip: ${lesson.tip}. Example:\n${lesson.code}`} label="Ask Grok about this lesson"/><div className="lesson-actions"><button className="button primary" onClick={complete}>{done?"✓ Completed":"Mark lesson complete"}</button>{next&&<Link className="button subtle" href={next}>Next lesson →</Link>}<Link className="text-link" href={`/learn/${lesson.language}`}>Back to path ↗</Link></div>{lesson.review!=="reviewed"&&<p className="notice">This lesson is awaiting human editorial review.</p>}</article>;
}
