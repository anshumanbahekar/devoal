let pythonProblems=[],pythonCurrent=null,pythonCode={};
try{pythonCode=JSON.parse(localStorage.getItem("dv-python-code.v1")||"{}")||{}}catch{}
const pythonRoot=()=>document.getElementById("python-root");
const pythonEscape=value=>String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);

async function loadPythonProblems(){
  try{const response=await fetch("python-practice.json");if(!response.ok)throw Error();pythonProblems=await response.json();pythonCurrent=pythonProblems[0];renderPythonPractice()}
  catch{if(pythonRoot())pythonRoot().textContent="Python problems could not load. Refresh and try again."}
}
function renderPythonPractice(){
  const root=pythonRoot();if(!root||!pythonCurrent)return;
  root.innerHTML=`<div class="python-layout"><div class="python-list">${pythonProblems.map((problem,index)=>`<button data-python="${index}" class="lt ${problem===pythonCurrent?"on":""} ${prog["py:"+problem.id]?"done":""}"><em>${index+1}</em>${pythonEscape(problem.title)}<span class="lv">${problem.level}</span></button>`).join("")}</div><article class="les"><h3>${pythonEscape(pythonCurrent.title)} <span class="lv">${pythonCurrent.level}</span></h3><p class="why mono">${pythonEscape(pythonCurrent.topic)} · ${pythonCurrent.tests.length} visible tests</p><p>${pythonEscape(pythonCurrent.prompt)}</p><textarea id="python-editor" class="mono" spellcheck="false" aria-label="Python code">${pythonEscape(pythonCode[pythonCurrent.id]??pythonCurrent.starter)}</textarea><div class="acts"><button class="btn" id="python-run">Run Python tests</button><button class="btn off" id="python-reset">Reset code</button></div><div id="python-output" aria-live="polite"></div></article></div>`;
}
async function runPythonPractice(){
  const button=document.getElementById("python-run"),output=document.getElementById("python-output");if(!button||!output)return;
  button.disabled=true;output.textContent="Loading Python runtime…";
  const problem=pythonCurrent,code=document.getElementById("python-editor").value,started=Date.now();
  pythonCode[problem.id]=code;try{localStorage.setItem("dv-python-code.v1",JSON.stringify(pythonCode))}catch{}
  let worker;
  try{
    worker=new Worker("python-worker.js",{type:"module"});
    const result=await new Promise((resolve,reject)=>{
      let phase="load";
      let timer=setTimeout(()=>reject(Error("Python runtime took too long to load. Check your connection and retry.")),60000);
      worker.onmessage=event=>{
        if(event.data.kind==="ready"){
          phase="run";clearTimeout(timer);timer=setTimeout(()=>reject(Error("Code exceeded the 5 second limit.")),5000);
          worker.postMessage({kind:"run",payload:{code,function:problem.function,tests:problem.tests}});
        }else if(event.data.kind==="result"){clearTimeout(timer);resolve(event.data.result)}
        else if(event.data.kind==="error"){clearTimeout(timer);reject(Error(event.data.error))}
      };
      worker.onerror=event=>{clearTimeout(timer);reject(Error(event.message|| (phase==="load"?"Python runtime could not start.":"Python runner failed.")))};
    });
    if(problem!==pythonCurrent)return;
    const rows=result.rows||[],passed=rows.length===problem.tests.length&&rows.every(row=>row.ok);
    output.innerHTML=`<div class="python-result ${passed?"passed":"failed"}"><b>${result.error?"Code error":passed?"All tests passed":`${rows.filter(row=>row.ok).length} of ${problem.tests.length} passed`}</b>${result.error?`<pre>${pythonEscape(result.error)}</pre>`:rows.map((row,index)=>`<p>${row.ok?"✓":"×"} Test ${index+1}: expected <code>${pythonEscape(row.expected)}</code>, got <code>${pythonEscape(row.actual)}</code></p>`).join("")}</div>`;
    recordAttempt("py:"+problem.id,passed,"python-practice",rows.filter(row=>row.ok).length,problem.tests.length,0,Math.floor((Date.now()-started)/1000));
    if(passed){const key="py:"+problem.id;if(!prog[key]||prog[key]===true){const first=!prog[key];prog[key]={Easy:10,Medium:20,Hard:30}[problem.level];if(first)bump();save();if(first)toast("Python problem solved · coins earned");const feedback=output.innerHTML;renderPythonPractice();document.getElementById("python-output").innerHTML=feedback}}
  }catch(error){if(problem===pythonCurrent)output.textContent=error.message}
  finally{worker?.terminate();if(button.isConnected)button.disabled=false}
}
document.addEventListener("click",event=>{
  const select=event.target.closest("[data-python]");if(select){pythonCurrent=pythonProblems[Number(select.dataset.python)];syncProblemLink("python",pythonCurrent.id);renderPythonPractice();return}
  if(event.target.id==="python-run")runPythonPractice();
  if(event.target.id==="python-reset"&&pythonCurrent){delete pythonCode[pythonCurrent.id];localStorage.setItem("dv-python-code.v1",JSON.stringify(pythonCode));renderPythonPractice()}
});
document.addEventListener("input",event=>{if(event.target.id==="python-editor"&&pythonCurrent){pythonCode[pythonCurrent.id]=event.target.value;try{localStorage.setItem("dv-python-code.v1",JSON.stringify(pythonCode))}catch{}}});
document.addEventListener("keydown",event=>{if(event.target.id!=="python-editor")return;if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){event.preventDefault();runPythonPractice()}else if(event.key==="Tab"){event.preventDefault();const editor=event.target,start=editor.selectionStart;editor.setRangeText("    ",start,editor.selectionEnd,"end");editor.dispatchEvent(new Event("input",{bubbles:true}))}});
