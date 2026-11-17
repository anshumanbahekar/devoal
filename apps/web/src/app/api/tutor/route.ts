import { NextRequest, NextResponse } from "next/server";

export const runtime="nodejs";
const windows=new Map<string,{count:number;reset:number}>();
const publicOrigin=process.env.DEVOAL_PUBLIC_ORIGIN||"https://anshumanbahekar.github.io";
const cors=(request:NextRequest):Record<string,string>=>{const origin=request.headers.get("origin");const headers:Record<string,string>={"Cache-Control":"no-store"};if(origin&&(origin===publicOrigin||origin===new URL(request.url).origin))Object.assign(headers,{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Vary":"Origin"});return headers};
const replyJson=(request:NextRequest,body:Record<string,string>,status=200)=>NextResponse.json(body,{status,headers:cors(request)});
export async function OPTIONS(request:NextRequest){const origin=request.headers.get("origin");if(origin&&origin!==publicOrigin&&origin!==new URL(request.url).origin)return new NextResponse(null,{status:403});return new NextResponse(null,{status:204,headers:cors(request)})}
export async function POST(request:NextRequest){
  const origin=request.headers.get("origin");if(origin&&origin!==publicOrigin&&origin!==new URL(request.url).origin)return replyJson(request,{error:"Origin is not allowed."},403);
  const key=process.env.XAI_API_KEY;
  if(!key)return replyJson(request,{error:"Grok is not configured yet."},503);
  const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"local";
  const now=Date.now(),limit=windows.get(ip);
  if(limit&&limit.reset>now&&limit.count>=12)return replyJson(request,{error:"Tutor limit reached. Please try again in an hour."},429);
  windows.set(ip,limit&&limit.reset>now?{count:limit.count+1,reset:limit.reset}:{count:1,reset:now+3600000});
  let body:unknown;try{body=await request.json();}catch{return replyJson(request,{error:"Invalid request."},400);}
  if(!body||typeof body!=="object")return replyJson(request,{error:"Invalid request."},400);
  const {question,context}=body as Record<string,unknown>;
  if(typeof question!=="string"||!question.trim()||question.length>1000||typeof context!=="string"||context.length>6000)return replyJson(request,{error:"Question or context is invalid."},400);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch("https://api.x.ai/v1/responses",{method:"POST",signal:controller.signal,headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.XAI_MODEL||"grok-4.7",store:false,max_output_tokens:600,input:[{role:"system",content:"You are a patient coding tutor for Devoal. Use the provided lesson or problem context. Explain concepts accurately and concisely. For a coding problem, give hints and debugging guidance first, not a complete solution unless the learner explicitly asks for one. If the context does not support a claim, say so. Never claim that code passed tests unless test results were provided."},{role:"user",content:`Learning context:\n${context}\n\nLearner question:\n${question}`}]} )});
    const data=await response.json();
    if(!response.ok)return replyJson(request,{error:"Grok could not answer right now. Please try again shortly."},502);
    const answer=Array.isArray(data.output)?data.output.filter((item:{type?:string})=>item.type==="message").flatMap((item:{content?:{type?:string;text?:string}[]})=>item.content||[]).filter((part:{type?:string})=>part.type==="output_text").map((part:{text?:string})=>part.text||"").join("\n").trim():"";
    if(!answer)return replyJson(request,{error:"Grok returned an empty response. Please try again."},502);
    return replyJson(request,{answer});
  }catch{return replyJson(request,{error:"Grok timed out. Please try again."},504);}finally{clearTimeout(timer);}
}
