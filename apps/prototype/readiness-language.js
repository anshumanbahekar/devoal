/* Python and SQL review suggestions alongside the JavaScript pattern plan. */
function languageReviewHtml(){
  const sets=[{label:"Python",prefix:"py:",route:"python-practice",icon:"python.svg",items:pythonProblems},{label:"SQL",prefix:"sql:",route:"sql-practice",icon:"sql.svg",items:sqlProblems}].filter(set=>set.items.length);
  if(!sets.length)return "";
  const stats=attemptStats(),now=Date.now();
  return `<div class="ip-section-head"><h3>Keep going across languages</h3><p>Your next Python and SQL exercises use the same attempt history and review schedule.</p></div><div class="rp-language-grid">${sets.map(set=>{
    const solved=set.items.filter(item=>prog[set.prefix+item.id]).length,due=set.items.filter(item=>stats[set.prefix+item.id]?.last?.reviewAt<=now).length;
    const next=set.items.map(item=>{const stat=stats[set.prefix+item.id];const rank=stat?.last?.reviewAt<=now?0:stat?.last&&!stat.last.passed?1:!stat&&!prog[set.prefix+item.id]?2:3;return {item,rank,stat}}).sort((a,b)=>a.rank-b.rank||(a.stat?.count||0)-(b.stat?.count||0)||({Easy:0,Medium:1,Hard:2}[a.item.level]-{Easy:0,Medium:1,Hard:2}[b.item.level])).slice(0,3);
    return `<section class="rp-language"><div class="rp-language-head"><img src="icons/${set.icon}" alt=""><div><h4>${set.label}</h4><p>${solved}/${set.items.length} solved · ${due} due for review</p></div></div>${next.map(row=>`<a href="#${set.route}" data-language="${set.prefix}" data-language-id="${esc(row.item.id)}"><span><b>${esc(row.item.title)}</b><small>${row.rank===0?"Due for review":row.rank===1?"Retry a miss":row.rank===2?"New problem":"Build consistency"} · ${esc(row.item.topic)}</small></span><strong>${row.item.level}</strong></a>`).join("")}</section>`}).join("")}</div>`;
}
document.getElementById("readiness-root").addEventListener("click",event=>{
  const link=event.target.closest("[data-language]");if(!link)return;
  const id=link.dataset.languageId;
  if(link.dataset.language==="py:")pythonCurrent=pythonProblems.find(item=>item.id===id)||pythonCurrent;
  else sqlCurrent=sqlProblems.find(item=>item.id===id)||sqlCurrent;
});
