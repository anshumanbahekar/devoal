import type { Metadata } from "next";
import { getChallenges } from "@/lib/content";
import { ProblemList } from "@/components/ProblemList";
export const metadata:Metadata={title:"Coding problems"};
export default function PracticePage(){return <main className="page-wrap"><div className="page-intro"><span className="eyebrow">THE PROBLEM SET</span><h1>Practice makes progress<span className="accent">.</span></h1><p>Build your problem-solving skills one challenge at a time. Write JavaScript, run test cases, and earn each solved status.</p><div className="stats-inline"><span><strong>{getChallenges().length}</strong> problems</span><span><strong>2</strong> difficulty levels</span><span><strong>JavaScript</strong> runner</span></div></div><ProblemList challenges={getChallenges()}/></main>}
