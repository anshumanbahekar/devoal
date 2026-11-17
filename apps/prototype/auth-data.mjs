export const syncKeys=["coal-prog","dv-st","dv-practice-code","dv-python-code.v1","dv-gq","dv-interview.v1","dv-interview-history.v1","dv-coins-spent.v1","dv-attempts.v1","dv-mock.v1","dv-mock-history.v1"];
export const readBrowserState=storage=>Object.fromEntries(syncKeys.map(key=>[key,storage.getItem(key)]));
const parse=(text,fallback)=>{try{return text?JSON.parse(text):fallback}catch{return fallback}};
const parseObject=text=>{const value=parse(text,{});return value&&typeof value==="object"&&!Array.isArray(value)?value:{}};
const parseArray=text=>{const value=parse(text,[]);return Array.isArray(value)?value:[]};
const arrayUnion=(a,b,identity)=>[...a,...b].filter((item,index,rows)=>item&&rows.findIndex(other=>other&&identity(other)===identity(item))===index).sort((x,y)=>(x.at||x.startedAt||x.finishedAt||0)-(y.at||y.startedAt||y.finishedAt||0));
export function mergeBrowserState(local,remote,{differentUser=false}={}){
  if(differentUser)return Object.fromEntries(syncKeys.map(key=>[key,remote?.[key]??null]));
  const result={...local,...Object.fromEntries(syncKeys.filter(key=>remote?.[key]!=null).map(key=>[key,remote[key]]))};
  const localProgress=parseObject(local["coal-prog"]),remoteProgress=parseObject(remote?.["coal-prog"]);
  result["coal-prog"]=JSON.stringify({...localProgress,...remoteProgress,...Object.fromEntries(Object.keys({...localProgress,...remoteProgress}).filter(key=>localProgress[key]||remoteProgress[key]).map(key=>[key,true]))});
  const localStats=parseObject(local["dv-st"]),remoteStats=parseObject(remote?.["dv-st"]),stats={...remoteStats,...localStats};
  for(const key of ["c","t","b"])stats[key]=Math.max(Number(localStats[key])||0,Number(remoteStats[key])||0);
  stats.hist={...remoteStats.hist,...localStats.hist};
  for(const day of Object.keys(stats.hist))stats.hist[day]=Math.max(Number(localStats.hist?.[day])||0,Number(remoteStats.hist?.[day])||0);
  stats.srs={...remoteStats.srs,...localStats.srs};
  for(const id of Object.keys(stats.srs))if((remoteStats.srs?.[id]?.d||0)>(localStats.srs?.[id]?.d||0))stats.srs[id]=remoteStats.srs[id];
  if(remoteStats.day?.d===localStats.day?.d&&localStats.day)stats.day={d:localStats.day.d,n:Math.max(localStats.day.n||0,remoteStats.day.n||0)};
  result["dv-st"]=JSON.stringify(stats);
  result["dv-practice-code"]=JSON.stringify({...parseObject(remote?.["dv-practice-code"]),...parseObject(local["dv-practice-code"])});
  result["dv-python-code.v1"]=JSON.stringify({...parseObject(remote?.["dv-python-code.v1"]),...parseObject(local["dv-python-code.v1"])});
  for(const [key,identity,limit] of [["dv-attempts.v1",item=>`${item.id}:${item.at}:${item.source}`,500],["dv-interview-history.v1",item=>`${item.startedAt}:${item.mode}`,30],["dv-mock-history.v1",item=>`${item.id}:${item.startedAt}`,20]]){
    result[key]=JSON.stringify(arrayUnion(parseArray(remote?.[key]),parseArray(local[key]),identity).slice(-limit));
  }
  result["dv-coins-spent.v1"]=String(Math.max(Number(local["dv-coins-spent.v1"])||0,Number(remote?.["dv-coins-spent.v1"])||0));
  for(const key of ["dv-interview.v1","dv-mock.v1"]){const a=parse(local[key],null),b=parse(remote?.[key],null);result[key]=JSON.stringify((a?.startedAt||0)>=(b?.startedAt||0)?a:b)}
  return result
}
