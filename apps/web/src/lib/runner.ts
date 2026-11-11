import type { Challenge } from "./content";
export type TestResult={passed:boolean;actual?:unknown;expected?:unknown;error?:string};

// The user's code runs in a sandboxed, opaque-origin iframe with network blocked by CSP.
// Removing the iframe ends long-running synchronous code without blocking this page.
export function runChallenge(challenge:Challenge,code:string):Promise<TestResult[]>{
  return new Promise((resolve)=>{
    const frame=document.createElement("iframe");
    frame.setAttribute("sandbox","allow-scripts");
    frame.setAttribute("aria-hidden","true");
    frame.style.display="none";
    const token=Math.random().toString(36).slice(2);
    let finished=false;
    const cleanup=(results:TestResult[])=>{if(finished)return;finished=true;clearTimeout(timer);window.removeEventListener("message",onMessage);frame.remove();resolve(results);};
    const onMessage=(event:MessageEvent)=>{if(event.source!==frame.contentWindow||event.data?.token!==token)return;cleanup(event.data.results);};
    const timer=window.setTimeout(()=>cleanup([{passed:false,error:"Time limit exceeded (3 seconds). Check for an infinite loop."}]),3000);
    window.addEventListener("message",onMessage);
    frame.srcdoc=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; connect-src 'none'; form-action 'none'"><script>
      window.addEventListener('message', async event => {
        const {token,code,name,tests}=event.data;
        const results=[];
        try {
          const fn=new Function(code+'\\n;return typeof '+name+' === "function" ? '+name+' : undefined;')();
          if(typeof fn!=='function')throw new Error('Define a function named '+name+'.');
          for(const test of tests){
            try {const actual=await fn(...test.args);const passed=JSON.stringify(actual)===JSON.stringify(test.expected);results.push({passed,actual,expected:test.expected});}
            catch(error){results.push({passed:false,error:String(error)});}
          }
        } catch(error){results.push({passed:false,error:String(error)});}
        parent.postMessage({token,results},'*');
      });
    <\/script>`;
    frame.addEventListener("load",()=>frame.contentWindow?.postMessage({token,code,name:challenge.function,tests:challenge.tests},"*"),{once:true});
    document.body.appendChild(frame);
  });
}
