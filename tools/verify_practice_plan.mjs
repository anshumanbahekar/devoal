import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext,runInContext} from "node:vm";

const values=new Map(),listeners=[];
const root={innerHTML:"",insertAdjacentHTML(_position,html){this.innerHTML+=html},addEventListener(_name,handler){listeners.push(handler)}};
const context=createContext({
  document:{getElementById:()=>root},
  localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},
  CH:[{i:"js-one",n:"JavaScript practice",v:"Easy",topic:"Arrays"}],
  pythonProblems:[{id:"py-one",title:"Python practice",level:"Easy",topic:"Lists"}],
  sqlProblems:[{id:"sql-one",title:"SQL practice",level:"Medium",topic:"Joins"}],
  interviewPatterns:[{id:"arrays",title:"Arrays",problems:["js-one"]}],
  interviewCompanies:[],
  interviewPattern:()=>({id:"arrays",title:"Arrays"}),
  prog:{"py:py-one":10},
  esc:value=>String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]),
  location:{hash:"#plan"},
  practiceFilter:{level:"All",query:"",saved:false},
  pythonCurrent:null,sqlCurrent:null,pc:null,
});
for(const file of ["readiness.js","readiness-language.js"]){
  runInContext(readFileSync(new URL(`../apps/prototype/${file}`,import.meta.url),"utf8"),context,{filename:file});
}
values.set("dv-attempts.v1",JSON.stringify([{id:"sql:sql-one",at:Date.now()-86400000,passed:false,source:"sql-practice",reviewAt:Date.now()-1000}]));
runInContext("renderReadiness()",context);
assert.match(root.innerHTML,/Next five JavaScript problems/);
assert.match(root.innerHTML,/data-language="py:"/);
assert.match(root.innerHTML,/data-language="sql:"/);
assert.match(root.innerHTML,/SQL practice[\s\S]*Due for review/);
assert.match(root.innerHTML,/Recent attempts/);
assert.match(root.innerHTML,/href="#problem\/sql\/sql-one"/);
const sqlLink={dataset:{language:"sql:",languageId:"sql-one"}};
for(const listener of listeners)listener({target:{closest:selector=>selector==="[data-language]"?sqlLink:null}});
assert.equal(context.sqlCurrent.id,"sql-one");
runInContext('recordAttempt("py:py-one",true,"python-practice",2,2)',context);
assert.equal(JSON.parse(values.get("dv-attempts.v1")).length,2);
values.set("dv-attempts.v1",JSON.stringify([
  {id:"js-one",at:Date.now(),passed:false,testsPassed:'<img src=x onerror="window.injected=true">',testsTotal:3},
  {id:"py:py-one",at:Date.now(),passed:true,testsPassed:99,testsTotal:"2.9",hintsUsed:-2,elapsedSec:"Infinity"},
  {id:"sql:sql-one",at:Date.now(),passed:false,testsPassed:1,testsTotal:'<svg onload="window.injected=true">'}
]));
const imported=runInContext("readAttempts()",context);
assert.equal(imported[0].testsPassed,0);
assert.equal(imported[1].testsPassed,2);
assert.equal(imported[1].testsTotal,2);
assert.equal(imported[1].hintsUsed,0);
assert.equal(imported[1].elapsedSec,0);
assert.equal(imported[2].testsTotal,0);
runInContext("renderReadiness()",context);
assert.doesNotMatch(runInContext("attemptHistoryHtml()",context),/<img|<svg|onerror=|onload=/);
assert.match(root.innerHTML,/0\/3 tests/);
assert.match(root.innerHTML,/2\/2 tests/);
runInContext('recordAttempt("js-one",false,"practice",-3,Infinity,-1,-2)',context);
const recorded=JSON.parse(values.get("dv-attempts.v1")).at(-1);
assert.equal(recorded.testsTotal,0);
assert.equal(recorded.testsPassed,0);
assert.equal(recorded.elapsedSec,0);
console.log("Three-language practice plan, due review, navigation, attempt capture and imported counters checked");
