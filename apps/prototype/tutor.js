/* Optional server-backed Grok tutor. The local lesson guide remains usable without it. */
window.devoalTutorApiEnabled=false;
window.devoalTutorReady=fetch("tutor-config.json",{cache:"no-store"}).then(response=>response.ok?response.json():{}).then(config=>{
  const url=typeof config.apiUrl==="string"?config.apiUrl.trim():"";
  if(!/^https:\/\//.test(url)&&!/^http:\/\/localhost(?::\d+)?\//.test(url))return null;
  window.devoalTutorApiEnabled=true;
  const label=document.getElementById("t-guide-label");if(label)label.textContent="Grok tutor";
  return url
}).catch(()=>null);
window.askGrok=async(question,context)=>{
  const url=await window.devoalTutorReady;if(!url)return null;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),26000);
  try{const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:question.slice(0,1000),context:context.slice(0,6000)}),signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(data.error||"Grok is unavailable");return typeof data.answer==="string"?data.answer.trim():null}
  finally{clearTimeout(timer)}
};
