import type { Metadata } from "next";
import { getLanguages, getQuizQuestions } from "@/lib/content";
import { ReviewSession } from "@/components/ReviewSession";
export const metadata: Metadata = { title: "Review and quiz" };
export default function ReviewPage() {
  return <main className="page-wrap"><div className="page-intro"><span className="eyebrow">REMEMBER WHAT YOU LEARN</span><h1>Review &amp; recall<span className="accent">.</span></h1><p>Test your understanding and revisit questions when they are due. Correct answers come back at longer intervals; missed answers return tomorrow.</p></div><ReviewSession questions={getQuizQuestions()} languages={getLanguages().map(({id,name})=>({id,name}))}/></main>;
}
