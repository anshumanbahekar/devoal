import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLanguage, getLanguages, getLesson, getLessonCount, getRoadmap } from "@/lib/content";
import { RoadmapProgress } from "@/components/RoadmapProgress";

export function generateStaticParams() { return getLanguages().map(lang => ({ language: lang.id })); }
export async function generateMetadata({ params }: {params: Promise<{language:string}>}): Promise<Metadata> { const {language} = await params; return {title: `${getLanguage(language)?.name || "Language"} path`}; }
export default async function LanguagePage({params}:{params:Promise<{language:string}>}) {
  const {language} = await params;
  const lang = getLanguage(language), roadmap = getRoadmap(language);
  if (!lang || !roadmap) notFound();
  const first = roadmap.stages.flatMap(stage => stage.topics).find(topic => getLesson(language, topic.slug));
  return <main className="page-wrap"><div className="page-intro"><div className="breadcrumbs"><Link href="/learn">Learning paths</Link><span>/</span><span>{lang.name}</span></div><h1>{lang.name}<span className="accent">.</span></h1><p>{lang.description} Follow the path at your own pace, from foundations to building projects.</p><div className="stats-inline"><span><strong>{getLessonCount(language)}</strong> lessons available</span><span><strong>{roadmap.stages.length}</strong> stages</span><span><strong>{lang.hours}h</strong> estimated</span></div>{first && <div style={{marginTop:24}}><Link className="button primary" href={`/learn/${language}/${first.slug}`}>Start learning <span>↗</span></Link></div>}</div><RoadmapProgress language={language} stages={roadmap.stages} available={Object.fromEntries(roadmap.stages.flatMap(stage => stage.topics).map(topic => [topic.slug, Boolean(getLesson(language, topic.slug))]))} /></main>;
}
