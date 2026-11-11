"use client";
import { useMemo, useState } from "react";
import type { QuizQuestion } from "@/lib/content";
import { answerReview, dueReviewIds, updateProgress } from "@/lib/progress";
import { useProgress } from "./ProgressClient";

export function ReviewSession({questions,languages}:{questions:QuizQuestion[];languages:{id:string;name:string}[]}) {
  const progress=useProgress();
  const [language,setLanguage]=useState("all");
  const [mode,setMode]=useState<"all"|"due">("all");
  const [activeId,setActiveId]=useState<string|null>(null);
  const [selected,setSelected]=useState<number|null>(null);
  const [sessionAnswered,setSessionAnswered]=useState<string[]>([]);
  const [sessionCorrect,setSessionCorrect]=useState(0);
  const due=dueReviewIds(progress);
  const pool=useMemo(()=>questions.filter(q=>(language==="all"||q.language===language)&&(mode==="all"||due.includes(q.id))&&!sessionAnswered.includes(q.id)),[questions,language,mode,due,sessionAnswered]);
  const question=activeId ? questions.find(q=>q.id===activeId) : pool[0];
  function resetFilters(nextLanguage:string,nextMode:"all"|"due") {setLanguage(nextLanguage);setMode(nextMode);setActiveId(null);setSelected(null);setSessionAnswered([]);setSessionCorrect(0)}
  function answer(choice:number){if(!question||selected!==null)return;setActiveId(question.id);setSelected(choice);const correct=choice===question.answer;if(correct)setSessionCorrect(n=>n+1);updateProgress(current=>answerReview(current,question.id,correct));}
  function next(){if(!question)return;setSessionAnswered(ids=>[...ids,question.id]);setActiveId(null);setSelected(null)}
  const attempted=Object.values(progress.reviews).reduce((sum,r)=>sum+r.attempts,0);
  return <div className="review-layout"><aside className="review-sidebar"><span className="lesson-label">REVIEW CONTROL</span><h2>Make it stick.</h2><p>Short, focused questions across your language paths.</p><div className="review-stat"><strong>{due.length}</strong><span>questions due</span></div><div className="review-stat"><strong>{attempted}</strong><span>total answers</span></div><label className="review-label" htmlFor="review-language">Language</label><select className="input" id="review-language" value={language} onChange={e=>resetFilters(e.target.value,mode)}><option value="all">All languages</option>{languages.map(lang=><option key={lang.id} value={lang.id}>{lang.name}</option>)}</select><div className="filter-row" style={{marginTop:16}}><button className={`filter-pill ${mode==="all"?"active":""}`} onClick={()=>resetFilters(language,"all")}>All questions</button><button className={`filter-pill ${mode==="due"?"active":""}`} onClick={()=>resetFilters(language,"due")}>Due now</button></div></aside><section className="review-main"><div className="review-top"><span>{mode==="due"?"DUE REVIEW":"PRACTICE QUIZ"} · {language==="all"?"ALL LANGUAGES":language.toUpperCase()}</span><span>{sessionAnswered.length} answered · {sessionCorrect} correct</span></div>{question?<div className="review-question" key={question.id}><span className="lesson-label">QUESTION {sessionAnswered.length+1}</span><h2>{question.question}</h2><div className="review-options">{question.options.map((option,choice)=><button key={choice} disabled={selected!==null} className={`review-option ${selected!==null&&choice===question.answer?"correct":""} ${selected===choice&&choice!==question.answer?"incorrect":""}`} onClick={()=>answer(choice)}><span>{String.fromCharCode(65+choice)}</span>{option}</button>)}</div>{selected!==null&&<div className="review-feedback" aria-live="polite"><strong>{selected===question.answer?"✓ Correct":"Not quite"}</strong><p>{question.explanation}</p><button className="button primary" onClick={next}>Next question →</button></div>}</div>:<div className="review-empty"><h2>{mode==="due"?"You’re caught up.":"Session complete."}</h2><p>{mode==="due"?"No questions are due in this selection. Practice more questions whenever you like.":`You answered ${sessionAnswered.length} question${sessionAnswered.length===1?"":"s"} and got ${sessionCorrect} correct.`}</p><button className="button subtle" onClick={()=>resetFilters(language,"all")}>Practice all questions →</button></div>}</section></div>;
}
