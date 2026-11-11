import type { Metadata } from "next";
import { getChallenges, getLanguages, getLessonCount } from "@/lib/content";
import { Profile } from "@/components/Profile";
export const metadata:Metadata={title:"Your profile"};
export default function ProfilePage(){const languages=getLanguages();return <main className="page-wrap"><div className="page-intro"><span className="eyebrow">YOUR JOURNEY</span><h1>Developer profile<span className="accent">.</span></h1><p>See what you have learned, what you have solved, and where you can go next. Progress is stored in this browser.</p></div><Profile languages={languages.map(lang=>({id:lang.id,name:lang.name,count:getLessonCount(lang.id)}))} challenges={getChallenges().map(({id,title,level})=>({id,title,level}))}/></main>}
