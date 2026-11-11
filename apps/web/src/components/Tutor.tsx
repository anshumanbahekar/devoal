"use client";
import { useState } from "react";
export function Tutor({context,label}:{context:string;label:string}){
  const [question,setQuestion]=useState("");const [answer,setAnswer]=useState("");const [busy,setBusy]=useState(false);
  async function ask(){if(!question.trim())return;setBusy(true);setAnswer("");try{const response=await fetch("/api/tutor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question,context})});const data=await response.json();setAnswer(response.ok?data.answer:data.error||"The tutor is unavailable right now.");}catch{setAnswer("The tutor is unavailable right now. Please try again.");}finally{setBusy(false);}}
  return <div className="tutor-box"><h3>✦ {label}</h3><p>Ask for an explanation, a debugging clue, or the next step.</p><textarea aria-label="Question for Grok tutor" placeholder="What should I think about next?" maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)}/><div style={{marginTop:8}}><button className="button subtle" disabled={busy||!question.trim()} onClick={ask}>{busy?"Thinking...":"Ask tutor ↗"}</button></div>{answer&&<div className="tutor-answer" aria-live="polite">{answer}</div>}</div>;
}
