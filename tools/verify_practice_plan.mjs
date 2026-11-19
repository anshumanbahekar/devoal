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
  esc:value=>String(value),
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
const sqlLink={dataset:{language:"sql:",languageId:"sql-one"}};
for(const listener of listeners)listener({target:{closest:selector=>selector==="[data-language]"?sqlLink:null}});
assert.equal(context.sqlCurrent.id,"sql-one");
runInContext('recordAttempt("py:py-one",true,"python-practice",2,2)',context);
assert.equal(JSON.parse(values.get("dv-attempts.v1")).length,2);
console.log("Three-language practice plan, due review, navigation, and attempt capture checked");
