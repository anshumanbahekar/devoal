import { LanguageLogo } from "@/components/LanguageLogo";
import Link from "next/link";
import { getChallenges, getLanguages, getLessonCount } from "@/lib/content";
import { DashboardSummary } from "@/components/DashboardSummary";

export default function HomePage() {
  const languages = getLanguages();
  const lessonCount = languages.reduce((sum, lang) => sum + getLessonCount(lang.id), 0);
  return <main>
    <section className="hero page-wrap">
      <div className="hero-copy">
        <span className="eyebrow"><span className="pulse" /> YOUR PATH TO BETTER CODE</span>
        <h1>Learn it.<br /><em>Build it.</em><br />Master it.</h1>
        <p>From your first variable to advanced problem solving. Clear lessons, hands-on challenges, and a path that grows with you.</p>
        <div className="hero-actions"><Link href="/learn" className="button primary">Explore learning paths <span>↗</span></Link><Link href="/practice" className="button subtle">Browse problems <span>→</span></Link></div>
        <div className="hero-proof"><strong>{languages.length}</strong><span>languages</span><i /><strong>{lessonCount}</strong><span>lessons</span><i /><strong>{getChallenges().length}</strong><span>coding problems</span></div>
      </div>
      <div className="hero-visual" aria-label="Learning journey preview"><div className="visual-top"><span className="window-dots"><i /><i /><i /></span><span>your-learning-journey</span><span>⌘</span></div><div className="visual-body"><div className="code-line muted">// your next chapter starts here</div><div className="code-line"><span className="syntax-pink">const</span> developer = {'{'}</div><div className="code-line indent">curiosity: <span className="syntax-yellow">true</span>,</div><div className="code-line indent">practice: <span className="syntax-green">"daily"</span>,</div><div className="code-line indent">potential: <span className="syntax-green">"unlimited"</span></div><div className="code-line">{'}'};</div><div className="code-line gap"><span className="syntax-pink">while</span> (developer.curiosity) {'{'}</div><div className="code-line indent">developer.<span className="syntax-blue">levelUp</span>();</div><div className="code-line">{'}'} <span className="cursor" /></div></div><div className="visual-bottom"><span>● READY TO BUILD</span><span>01 / ∞</span></div></div>
    </section>
    <section className="page-wrap section-space"><div className="section-heading"><div><span className="eyebrow">PICK YOUR STARTING POINT</span><h2>Find your language<span className="accent">.</span></h2><p>Structured paths from fundamentals through real-world skills.</p></div><Link href="/learn" className="text-link">All learning paths ↗</Link></div><div className="language-grid">{languages.map(lang => <Link href={`/learn/${lang.id}`} className="language-card" key={lang.id} style={{ "--language-color": lang.color } as React.CSSProperties}><div className="language-card-top"><LanguageLogo id={lang.id} name={lang.name} /><span className="card-arrow">↗</span></div><h3>{lang.name}</h3><p>{lang.description}</p><div className="card-meta"><span>{getLessonCount(lang.id) ? `${getLessonCount(lang.id)} lessons` : "Lessons in development"}</span><span>{lang.level}</span></div></Link>)}</div></section>
    <section className="page-wrap section-space split-section"><div className="feature-panel"><span className="eyebrow">PRACTICE WITH PURPOSE</span><h2>Turn knowledge<br />into instinct<span className="accent">.</span></h2><p>Work through focused coding problems, run your solution against real test cases, and track every win.</p><Link href="/practice" className="button primary">Open problem set <span>↗</span></Link><div className="feature-decoration">{'{ solve → improve }'}</div></div><DashboardSummary /></section>
    <section className="page-wrap section-space"><div className="section-heading"><div><span className="eyebrow">HOW IT WORKS</span><h2>A clear way forward<span className="accent">.</span></h2></div></div><div className="steps"><div><span>01 / LEARN</span><h3>Build the foundation</h3><p>Understand each concept with concise explanations and runnable examples.</p></div><div><span>02 / PRACTICE</span><h3>Make it stick</h3><p>Solve problems with test cases and get feedback as you improve.</p></div><div><span>03 / GROW</span><h3>See your progress</h3><p>Follow your completed lessons, solved problems, activity, and streak.</p></div></div></section>
  </main>;
}
