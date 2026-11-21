export const syncKeys=["coal-prog","dv-st","dv-practice-code","dv-python-code.v1","dv-sql-code.v1","dv-gq","dv-interview.v1","dv-interview-history.v1","dv-coins-spent.v1","dv-attempts.v1","dv-mock.v1","dv-mock-history.v1","dv-problem-notes.v1","dv-code-checkpoints.v1"];
export const readBrowserState=storage=>Object.fromEntries(syncKeys.map(key=>[key,storage.getItem(key)]));
const parse=(text,fallback)=>{try{return text?JSON.parse(text):fallback}catch{return fallback}};
const parseObject=text=>{const value=parse(text,{});return value&&typeof value==="object"&&!Array.isArray(value)?value:{}};
const parseArray=text=>{const value=parse(text,[]);return Array.isArray(value)?value:[]};
const arrayUnion=(a,b,identity)=>[...a,...b].filter((item,index,rows)=>item&&rows.findIndex(other=>other&&identity(other)===identity(item))===index).sort((x,y)=>(x.at||x.startedAt||x.finishedAt||0)-(y.at||y.startedAt||y.finishedAt||0));
export function mergeBrowserState(local,remote,{differentUser=false}={}){
  if(differentUser)return Object.fromEntries(syncKeys.map(key=>[key,remote?.[key]??null]));
  const result={...local,...Object.fromEntries(syncKeys.filter(key=>remote?.[key]!=null).map(key=>[key,remote[key]]))};
  const localProgress=parseObject(local["coal-prog"]),remoteProgress=parseObject(remote?.["coal-prog"]);
  result["coal-prog"]=JSON.stringify({...localProgress,...remoteProgress,...Object.fromEntries(Object.keys({...localProgress,...remoteProgress}).filter(key=>localProgress[key]||remoteProgress[key]).map(key=>[key,typeof localProgress[key]==="number"||typeof remoteProgress[key]==="number"?Math.max(Number(localProgress[key])||0,Number(remoteProgress[key])||0):true]))});
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
  result["dv-sql-code.v1"]=JSON.stringify({...parseObject(remote?.["dv-sql-code.v1"]),...parseObject(local["dv-sql-code.v1"])});
  const localNotes=parseObject(local["dv-problem-notes.v1"]),remoteNotes=parseObject(remote?.["dv-problem-notes.v1"]),notes={};
  for(const entries of [remoteNotes,localNotes])for(const [key,note] of Object.entries(entries)){
    if(!note||typeof note.text!=="string"||!Number.isFinite(note.updatedAt)||note.updatedAt<0)continue;
    if(!notes[key]||note.updatedAt>=notes[key].updatedAt)notes[key]={text:note.text,updatedAt:note.updatedAt};
  }
  result["dv-problem-notes.v1"]=JSON.stringify(notes);
  const localCheckpoints=parseObject(local["dv-code-checkpoints.v1"]),remoteCheckpoints=parseObject(remote?.["dv-code-checkpoints.v1"]);
  const checkpoints=Object.fromEntries(Object.keys({...remoteCheckpoints,...localCheckpoints}).map(key=>[
    key,arrayUnion(Array.isArray(remoteCheckpoints[key])?remoteCheckpoints[key]:[],Array.isArray(localCheckpoints[key])?localCheckpoints[key]:[],item=>item.id)
  ]));
  result["dv-code-checkpoints.v1"]=JSON.stringify(checkpoints);
  for(const [key,identity,limit] of [["dv-attempts.v1",item=>`${item.id}:${item.at}:${item.source}`,500],["dv-interview-history.v1",item=>`${item.startedAt}:${item.mode}`,30],["dv-mock-history.v1",item=>`${item.id}:${item.startedAt}`,20]]){
    result[key]=JSON.stringify(arrayUnion(parseArray(remote?.[key]),parseArray(local[key]),identity).slice(-limit));
  }
  result["dv-coins-spent.v1"]=String(Math.max(Number(local["dv-coins-spent.v1"])||0,Number(remote?.["dv-coins-spent.v1"])||0));
  for(const key of ["dv-interview.v1","dv-mock.v1"]){const a=parse(local[key],null),b=parse(remote?.[key],null);result[key]=JSON.stringify((a?.startedAt||0)>=(b?.startedAt||0)?a:b)}
  return result
}

// Keep each account's unsynced work when its browser session changes.
export function switchBrowserAccount(storage, nextUid) {
  const previousUid = storage.getItem("dv-last-uid");
  if (previousUid === nextUid) return false;
  const previous = readBrowserState(storage);
  if (previousUid) storage.setItem(`dv-account-state.v1:${previousUid}`, JSON.stringify(previous));
  const saved = nextUid ? parseObject(storage.getItem(`dv-account-state.v1:${nextUid}`)) : {};
  const incoming = nextUid && !previousUid
    ? Object.keys(saved).length ? mergeBrowserState(previous, saved) : previous
    : Object.fromEntries(syncKeys.map(key => [key, saved[key] ?? null]));
  let changed = false;
  try {
    for (const key of syncKeys) {
      const value = incoming[key] ?? null;
      if (previous[key] === value) continue;
      changed = true;
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    }
    if (nextUid) storage.setItem("dv-last-uid", nextUid);
    else storage.removeItem("dv-last-uid");
  } catch (error) {
    for (const key of syncKeys) {
      if (previous[key] === null) storage.removeItem(key);
      else storage.setItem(key, previous[key]);
    }
    throw error;
  }
  return changed;
}
