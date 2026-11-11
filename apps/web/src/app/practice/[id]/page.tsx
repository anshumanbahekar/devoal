import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChallenge, getChallenges } from "@/lib/content";
import { PracticeWorkspace } from "@/components/PracticeWorkspace";
export function generateStaticParams(){return getChallenges().map(c=>({id:c.id}));}
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const {id}=await params;return {title:getChallenge(id)?.title||"Problem"};}
export default async function ProblemPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const challenge=getChallenge(id);if(!challenge)notFound();const list=getChallenges(),index=list.findIndex(c=>c.id===id);return <main className="page-wrap"><div className="page-intro"><div className="breadcrumbs"><Link href="/practice">Problem set</Link><span>/</span><span>{challenge.title}</span></div><div className="stats-inline"><span>PROBLEM {String(index+1).padStart(2,"0")} / {list.length}</span><span>{challenge.level}</span><span>JavaScript</span></div></div><PracticeWorkspace challenge={challenge} next={list[index+1]?.id||null}/></main>}
