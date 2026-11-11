import { NextRequest, NextResponse } from "next/server";

export const runtime="nodejs";
const windows=new Map<string,{count:number;reset:number}>();
export async function POST(request:NextRequest){
  const key=process.env.XAI_API_KEY;
  if(!key)return NextResponse.json({error:"Grok is not configured yet. Add XAI_API_KEY to apps/web/.env.local to enable the tutor."},{status:503});
  const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"local";
  const now=Date.now(),limit=windows.get(ip);
  if(limit&&limit.reset>now&&limit.count>=12)return NextResponse.json({error:"Tutor limit reached. Please try again in an hour."},{status:429});
  windows.set(ip,limit&&limit.reset>now?{count:limit.count+1,reset:limit.reset}:{count:1,reset:now+3600000});
  let body:unknown;try{body=await request.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
  if(!body||typeof body!=="object")return NextResponse.json({error:"Invalid request."},{status:400});
  const {question,context}=body as Record<string,unknown>;
  if(typeof question!=="string"||!question.trim()||question.length>1000||typeof context!=="string"||context.length>6000)return NextResponse.json({error:"Question or context is invalid."},{status:400});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch("https://api.x.ai/v1/responses",{method:"POST",signal:controller.signal,headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.XAI_MODEL||"grok-4.7",store:false,max_output_tokens:600,input:[{role:"system",content:"You are a patient coding tutor for Devoal. Use the provided lesson or problem context. Explain concepts accurately and concisely. For a coding problem, give hints and debugging guidance first, not a complete solution unless the learner explicitly asks for one. If the context does not support a claim, say so. Never claim that code passed tests unless test results were provided."},{role:"user",content:`Learning context:\n${context}\n\nLearner question:\n${question}`}]} )});
    const data=await response.json();
    if(!response.ok)return NextResponse.json({error:"Grok could not answer right now. Please try again shortly."},{status:502});
    const answer=Array.isArray(data.output)?data.output.filter((item:{type?:string})=>item.type==="message").flatMap((item:{content?:{type?:string;text?:string}[]})=>item.content||[]).filter((part:{type?:string})=>part.type==="output_text").map((part:{text?:string})=>part.text||"").join("\n").trim():"";
    if(!answer)return NextResponse.json({error:"Grok returned an empty response. Please try again."},{status:502});
    return NextResponse.json({answer});
  }catch{return NextResponse.json({error:"Grok timed out. Please try again."},{status:504});}finally{clearTimeout(timer);}
}
