"use client";
import Link from "next/link";
import type { Stage } from "@/lib/content";
import { useProgress } from "./ProgressClient";

export function RoadmapProgress({language, stages, available}:{language:string;stages:Stage[];available:Record<string,boolean>}) {
  const progress = useProgress();
  return <div className="stage-grid" style={{paddingBottom:80}}>{stages.map(stage => {const finished = stage.topics.filter(topic => progress.completedLessons.includes(`${language}/${topic.slug}`)).length; return <section className="stage-card" key={stage.stage}><div className="stage-card-head"><div><span className="lesson-label">STAGE {String(stage.stage).padStart(2,"0")}</span><h2>{stage.title}</h2><p>{finished} of {stage.topics.length} topics completed</p></div><span className="tag">{Math.round(finished / stage.topics.length * 100)}%</span></div><div className="progress-bar"><i style={{width:`${finished / stage.topics.length * 100}%`}} /></div><div className="topic-list">{stage.topics.map(topic => available[topic.slug] ? <Link key={topic.slug} href={`/learn/${language}/${topic.slug}`}>{progress.completedLessons.includes(`${language}/${topic.slug}`) ? "✓ " : ""}{topic.title} ↗</Link> : <span key={topic.slug} className="unavailable" title="Lesson in development">{topic.title} · soon</span>)}</div></section>;})}</div>;
}
