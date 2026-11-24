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
  mountProblemWorkspace(root.querySelector("article"),"python",pythonCurrent.id,"python-editor");
}
async function runPythonPractice(){
  const button=document.getElementById("python-run"),output=document.getElementById("python-output");if(!button||!output||button.disabled)return;
  button.disabled=true;output.textContent="Loading Python runtime…";
  const problem=pythonCurrent,code=document.getElementById("python-editor").value,started=Date.now();
  pythonCode[problem.id]=code;try{localStorage.setItem("dv-python-code.v1",JSON.stringify(pythonCode))}catch{}
  let worker;
  try{
    worker=new Worker("python-worker.js?v=20261124",{type:"module"});
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
    if(problem!==pythonCurrent||!output.isConnected||document.body.dataset.v!=="python-practice")return;
    const rows=result.rows||[],passed=rows.length===problem.tests.length&&rows.every(row=>row.ok),testsPassed=rows.filter(row=>row.ok).length;
    const runtimeMs=Number.isFinite(result.runtimeMs)&&result.runtimeMs>=0?result.runtimeMs:null;
    const insights=runInsightsHtml("py:"+problem.id,{runtimeMs,passed,testsPassed,testsTotal:problem.tests.length,benchmark:"browser-v1"});
    output.innerHTML=insights+`<div class="python-result ${passed?"passed":"failed"}"><b>${result.error?"Code error":passed?"All tests passed":`${testsPassed} of ${problem.tests.length} passed`}</b>${result.error?`<pre>${pythonEscape(result.error)}</pre>`:rows.map((row,index)=>`<p>${row.ok?"✓":"×"} Test ${index+1}: expected <code>${pythonEscape(row.expected)}</code>, got <code>${pythonEscape(row.actual)}</code></p>`).join("")}</div>`;
    recordAttempt("py:"+problem.id,passed,"python-practice",testsPassed,problem.tests.length,0,Math.floor((Date.now()-started)/1000),runtimeMs,"browser-v1");
    if(passed){const key="py:"+problem.id;if(!prog[key]||prog[key]===true){const first=!prog[key];prog[key]={Easy:10,Medium:20,Hard:30}[problem.level];if(first)bump();save();if(first)toast("Python problem solved · coins earned");const feedback=output.innerHTML;renderPythonPractice();document.getElementById("python-output").innerHTML=feedback}}
  }catch(error){if(problem===pythonCurrent&&output.isConnected&&document.body.dataset.v==="python-practice")output.innerHTML=runInsightsHtml("py:"+problem.id,{runtimeMs:null,passed:false,testsPassed:0,testsTotal:problem.tests.length,benchmark:"browser-v1"})+`<p class="python-result failed">${pythonEscape(error.message)}</p>`}
  finally{worker?.terminate();if(button.isConnected)button.disabled=false}
}
document.addEventListener("click",event=>{
  const select=event.target.closest("[data-python]");if(select){pythonCurrent=pythonProblems[Number(select.dataset.python)];syncProblemLink("python",pythonCurrent.id);renderPythonPractice();return}
  if(event.target.id==="python-run")runPythonPractice();
  if(event.target.id==="python-reset"&&pythonCurrent){delete pythonCode[pythonCurrent.id];localStorage.setItem("dv-python-code.v1",JSON.stringify(pythonCode));renderPythonPractice()}
});
document.addEventListener("input",event=>{if(event.target.id==="python-editor"&&pythonCurrent){pythonCode[pythonCurrent.id]=event.target.value;try{localStorage.setItem("dv-python-code.v1",JSON.stringify(pythonCode))}catch{}}});
document.addEventListener("keydown",event=>{if(event.target.id!=="python-editor")return;if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){event.preventDefault();runPythonPractice()}else if(event.key==="Tab"){event.preventDefault();const editor=event.target,start=editor.selectionStart;editor.setRangeText("    ",start,editor.selectionEnd,"end");editor.dispatchEvent(new Event("input",{bubbles:true}))}});
