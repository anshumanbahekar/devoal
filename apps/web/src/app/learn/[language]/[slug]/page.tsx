import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLanguage, getLanguages, getLesson, getRoadmap } from "@/lib/content";
import { LessonClient } from "@/components/LessonClient";

export function generateStaticParams() {return getLanguages().flatMap(lang => getRoadmap(lang.id)?.stages.flatMap(stage => stage.topics).filter(topic => getLesson(lang.id, topic.slug)).map(topic => ({language:lang.id,slug:topic.slug})) || []);}
export async function generateMetadata({params}:{params:Promise<{language:string;slug:string}>}):Promise<Metadata>{const {language,slug}=await params;return {title:`${getLesson(language,slug)?.title || "Lesson"} · ${getLanguage(language)?.name || ""}`};}
export default async function LessonPage({params}:{params:Promise<{language:string;slug:string}>}) {
  const {language,slug}=await params;const lang=getLanguage(language),lesson=getLesson(language,slug),roadmap=getRoadmap(language);
  if(!lang||!lesson||!roadmap) notFound();
  const topics=roadmap.stages.flatMap(stage=>stage.topics).filter(topic=>getLesson(language,topic.slug));
  const index=topics.findIndex(topic=>topic.slug===slug);
  const next=topics[index+1];
  return <main className="page-wrap"><div className="page-intro"><div className="breadcrumbs"><Link href="/learn">Learning paths</Link><span>/</span><Link href={`/learn/${language}`}>{lang.name}</Link><span>/</span><span>{lesson.title}</span></div><h1>{lesson.title}<span className="accent">.</span></h1><p>{lang.name} · Stage {lesson.stage} · Lesson {index+1} of {topics.length}</p></div><div className="content-grid"><aside className="sidebar"><div className="sidebar-title">{lang.name.toUpperCase()} PATH</div>{roadmap.stages.map(stage=><div key={stage.stage}><div className="sidebar-stage">{String(stage.stage).padStart(2,"0")} / {stage.title}</div>{stage.topics.filter(topic=>getLesson(language,topic.slug)).map(topic=><Link href={`/learn/${language}/${topic.slug}`} className={`sidebar-link ${topic.slug===slug?"active":""}`} key={topic.slug}>{topic.title}</Link>)}</div>)}</aside><LessonClient lesson={lesson} languageName={lang.name} next={next ? `/learn/${language}/${next.slug}` : null}/></div></main>;
}
