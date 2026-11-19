let sqlProblems=[],sqlCurrent=null,sqlDrafts={};
try{sqlDrafts=JSON.parse(localStorage.getItem("dv-sql-code.v1")||"{}")||{}}catch{}
const sqlRoot=()=>document.getElementById("sql-root");
const sqlEscape=value=>String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);

async function loadSqlProblems(){
  try{const response=await fetch("sql-practice.json");if(!response.ok)throw Error();sqlProblems=await response.json();sqlCurrent=sqlProblems[0];renderSqlPractice()}
  catch{if(sqlRoot())sqlRoot().textContent="SQL problems could not load. Refresh and try again."}
}
function renderSqlPractice(){
  const root=sqlRoot();if(!root||!sqlCurrent)return;
  const problem=sqlCurrent;
  root.innerHTML=`<div class="sql-layout"><div class="sql-list">${sqlProblems.map((entry,index)=>`<button data-sql="${index}" class="lt ${entry===problem?"on":""} ${prog["sql:"+entry.id]?"done":""}"><em>${index+1}</em>${sqlEscape(entry.title)}<span class="lv">${entry.level}</span></button>`).join("")}</div><article class="les"><h3>${sqlEscape(problem.title)} <span class="lv">${problem.level}</span></h3><p class="why mono">${sqlEscape(problem.topic)} · ${problem.cases.length} datasets · SQLite</p><p>${sqlEscape(problem.prompt)}</p><details class="sql-data"><summary>Inspect schema and sample data</summary><pre class="mono">${sqlEscape(problem.schema+"\n"+problem.cases[0].seed)}</pre></details><textarea id="sql-editor" class="mono" spellcheck="false" aria-label="SQL query">${sqlEscape(sqlDrafts[problem.id]??problem.starter)}</textarea><div class="acts"><button class="btn" id="sql-run">Run SQL tests</button><button class="btn off" id="sql-reset">Reset query</button></div><div id="sql-output" aria-live="polite"></div></article></div>`;
}
function sqlTable(values,columns){
  if(!values?.length)return '<p>No rows returned.</p>';
  return `<div class="sql-table-scroll"><table><thead><tr>${columns.map(column=>`<th>${sqlEscape(column)}</th>`).join("")}</tr></thead><tbody>${values.slice(0,12).map(row=>`<tr>${row.map(cell=>`<td>${sqlEscape(cell===null?"NULL":cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${values.length>12?`<small>Showing 12 of ${values.length} rows</small>`:""}`;
}
async function runSqlPractice(){
  const button=document.getElementById("sql-run"),output=document.getElementById("sql-output");if(!button||!output)return;
  button.disabled=true;output.textContent="Starting SQLite…";
  const problem=sqlCurrent,query=document.getElementById("sql-editor").value,started=Date.now();let worker;
  sqlDrafts[problem.id]=query;try{localStorage.setItem("dv-sql-code.v1",JSON.stringify(sqlDrafts))}catch{}
  try{
    worker=new Worker("sql-worker.js");
    const rows=await new Promise((resolve,reject)=>{
      let timer=setTimeout(()=>reject(Error("SQLite took too long to load. Retry the query.")),30000);
      worker.onmessage=event=>{
        if(event.data.kind==="ready"){
          clearTimeout(timer);timer=setTimeout(()=>reject(Error("Query exceeded the 5 second limit.")),5000);
          worker.postMessage({kind:"run",query,problem});
        }else if(event.data.kind==="result"){clearTimeout(timer);resolve(event.data.rows)}
        else if(event.data.kind==="error"){clearTimeout(timer);reject(Error(event.data.error))}
      };
      worker.onerror=event=>{clearTimeout(timer);reject(Error(event.message||"SQLite worker failed."))};
    });
    if(problem!==sqlCurrent)return;
    const passed=rows.length===problem.cases.length&&rows.every(row=>row.ok);
    output.innerHTML=`<div class="sql-result ${passed?"passed":"failed"}"><b>${passed?"All datasets passed":`${rows.filter(row=>row.ok).length} of ${problem.cases.length} datasets passed`}</b>${rows.map((row,index)=>`<section><h4>${row.ok?"✓":"×"} Dataset ${index+1}</h4>${row.error?`<p class="sql-error">${sqlEscape(row.error)}</p>`:`${sqlTable(row.actual,row.columns)}${row.ok?"":`<details><summary>Expected rows</summary>${sqlTable(row.expected,row.expected[0]?.map((_,i)=>"Column "+(i+1))||[])}</details>`}`}</section>`).join("")}</div>`;
    recordAttempt("sql:"+problem.id,passed,"sql-practice",rows.filter(row=>row.ok).length,problem.cases.length,0,Math.floor((Date.now()-started)/1000));
    if(passed){const key="sql:"+problem.id;if(!prog[key]){prog[key]={Easy:10,Medium:20,Hard:30}[problem.level];bump();save();toast("SQL problem solved");const feedback=output.innerHTML;renderSqlPractice();document.getElementById("sql-output").innerHTML=feedback}}
  }catch(error){if(problem===sqlCurrent)output.textContent=error.message}
  finally{worker?.terminate();if(button.isConnected)button.disabled=false}
}
document.addEventListener("click",event=>{
  const select=event.target.closest("[data-sql]");if(select){sqlCurrent=sqlProblems[Number(select.dataset.sql)];renderSqlPractice();return}
  if(event.target.id==="sql-run")runSqlPractice();
  if(event.target.id==="sql-reset"&&sqlCurrent){delete sqlDrafts[sqlCurrent.id];try{localStorage.setItem("dv-sql-code.v1",JSON.stringify(sqlDrafts))}catch{}renderSqlPractice()}
});
document.addEventListener("input",event=>{if(event.target.id==="sql-editor"&&sqlCurrent){sqlDrafts[sqlCurrent.id]=event.target.value;try{localStorage.setItem("dv-sql-code.v1",JSON.stringify(sqlDrafts))}catch{}}});
document.addEventListener("keydown",event=>{if(event.target.id==="sql-editor"&&(event.ctrlKey||event.metaKey)&&event.key==="Enter"){event.preventDefault();runSqlPractice()}});
