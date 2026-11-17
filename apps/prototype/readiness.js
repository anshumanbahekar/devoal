/* Browser-local practice evidence. Scores describe practice coverage, not hiring odds. */
const attemptKey="dv-attempts.v1";
function readAttempts(){
  try{const rows=JSON.parse(localStorage.getItem(attemptKey)||"[]");return Array.isArray(rows)?rows.filter(row=>row&&typeof row.id==="string"&&Number.isFinite(row.at)&&typeof row.passed==="boolean").slice(-500):[]}
  catch(e){return[]}
}
function attemptStats(){
  const stats={};for(const row of readAttempts()){
    const current=stats[row.id]||{count:0,passes:0,streak:0,last:null};
    current.count++;if(row.passed){current.passes++;current.streak++}else current.streak=0;
    current.last=row;stats[row.id]=current
  }return stats
}
function recordAttempt(id,passed,source,testsPassed,testsTotal,hintsUsed=0,elapsedSec=0){
  if(!CH.some(problem=>problem.i===id)&&!pythonProblems?.some(problem=>"py:"+problem.id===id))return;
  const rows=readAttempts(),prior=attemptStats()[id],streak=passed?(prior?.streak||0)+1:0;
  const days=passed?streak===1?3:streak===2?7:14:1;
  rows.push({id,at:Date.now(),passed:!!passed,source,testsPassed:Number(testsPassed)||0,testsTotal:Number(testsTotal)||0,hintsUsed:Number(hintsUsed)||0,elapsedSec:Math.max(0,Number(elapsedSec)||0),reviewAt:Date.now()+days*86_400_000});
  try{localStorage.setItem(attemptKey,JSON.stringify(rows.slice(-500)))}catch(e){}
}
function buildPracticePlan(companyId=null){
  const company=interviewCompanies.find(item=>item.id===companyId),pool=company?CH.filter(item=>company.problems.includes(item.i)):CH,stats=attemptStats(),now=Date.now();
  const annotated=pool.map(problem=>{const stat=stats[problem.i],legacySolved=!!prog["c:"+problem.i];let kind,rank;
    if(stat?.last?.reviewAt<=now){kind="Due for review";rank=0}
    else if(stat?.last&&!stat.last.passed){kind="Retry a missed problem";rank=1}
    else if(!stat&&!legacySolved){kind="New practice";rank=2}
    else if(stat?.last?.passed&&stat.streak<2){kind="Build consistency";rank=3}
    else{kind="Stretch practice";rank=4}
    return {problem,stat,kind,rank,pattern:interviewPattern(problem.i)?.id||"other"}
  });
  annotated.sort((a,b)=>a.rank-b.rank||(a.stat?.count||0)-(b.stat?.count||0)||({Easy:0,Medium:1,Hard:2}[a.problem.v]-{Easy:0,Medium:1,Hard:2}[b.problem.v])||a.problem.n.localeCompare(b.problem.n));
  const chosen=[],used=new Set();for(const entry of annotated){if(chosen.length===5)break;if(!used.has(entry.pattern)){chosen.push(entry);used.add(entry.pattern)}}
  for(const entry of annotated){if(chosen.length===5)break;if(!chosen.includes(entry))chosen.push(entry)}
  return {items:chosen,stats,total:pool.length,solved:pool.filter(problem=>prog["c:"+problem.i]).length,attempted:pool.filter(problem=>stats[problem.i]).length,due:pool.filter(problem=>stats[problem.i]?.last?.reviewAt<=now).length}
}
function renderReadiness(companyId=null){
  const root=document.getElementById("readiness-root");if(!root)return;
  if(!interviewPatterns.length){root.innerHTML='<p class="why">Loading your practice plan…</p>';return}
  const plan=buildPracticePlan(companyId),scope=interviewCompanies.find(item=>item.id===companyId),patterns=interviewPatterns.map(pattern=>{
    const problems=pattern.problems.filter(id=>!scope||scope.problems.includes(id));return {pattern,problems,solved:problems.filter(id=>prog["c:"+id]).length}
  }).filter(row=>row.problems.length);
  root.innerHTML=`<div class="ip-section-head"><h3>${scope?esc(scope.name)+" ":"Your "}practice plan</h3><p>Based on your browser test results. Solve new problems and revisit misses when they are due.</p></div><div class="rp-stats"><div><b>${plan.solved}<small>/${plan.total}</small></b><span>Solved</span></div><div><b>${plan.attempted}</b><span>Attempted here</span></div><div><b>${plan.due}</b><span>Due for review</span></div></div><div class="rp-layout"><div class="rp-list"><h4>Next five problems</h4>${plan.items.map((item,index)=>`<a href="#practice" data-practice="${esc(item.problem.i)}"><em>${String(index+1).padStart(2,"0")}</em><span><b>${esc(item.problem.n)}</b><small>${esc(item.kind)} · ${esc(interviewPattern(item.problem.i)?.title||item.problem.topic)}</small></span><strong>${esc(item.problem.v)}</strong></a>`).join("")}</div><div class="rp-patterns"><h4>Pattern coverage</h4>${patterns.map(row=>`<div class="rp-pattern"><div><b>${esc(row.pattern.title)}</b><span>${row.solved}/${row.problems.length}</span></div><i><span style="width:${Math.round(row.solved/row.problems.length*100)}%"></span></i></div>`).join("")}</div></div><p class="rp-note">Review timing: a missed attempt returns tomorrow; correct attempts return after 3, 7, then 14 days. This is practice guidance, not a prediction of interview success.</p>`
}
document.getElementById("readiness-root").addEventListener("click",event=>{const link=event.target.closest("[data-practice]");if(!link)return;const problem=CH.find(item=>item.i===link.dataset.practice);if(!problem)return;pc=problem;practiceFilter.level="All";practiceFilter.query="";practiceFilter.saved=false;location.hash="practice"});
