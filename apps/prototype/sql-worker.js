try {
  importScripts("vendor/sql-wasm.js");
  var SQL;
  initSqlJs({locateFile:file=>"vendor/"+file}).then(runtime=>{SQL=runtime;postMessage({kind:"ready"})}).catch(error=>postMessage({kind:"error",error:"SQLite runtime could not start: "+String(error).slice(0,250)}));
} catch (error) {
  postMessage({kind:"error",error:"SQLite runtime could not start: "+String(error).slice(0,250)});
}

onmessage=event=>{
  if(!SQL||event.data?.kind!=="run")return;
  const {query,problem}=event.data;
  const rows=[];
  let runtimeMs=null;
  for(const test of problem.cases){
    const db=new SQL.Database();
    try{
      db.run(problem.schema);db.run(test.seed);db.run("PRAGMA query_only = ON");
      let output;
      const started=performance.now();
      try{output=db.exec(query)}finally{runtimeMs=(runtimeMs??0)+performance.now()-started}
      const actual=output.length?output[output.length-1].values:[];
      rows.push({ok:JSON.stringify(actual)===JSON.stringify(test.expected),actual,expected:test.expected,columns:output.length?output[output.length-1].columns:[],error:""});
    }catch(error){rows.push({ok:false,actual:[],expected:test.expected,columns:[],error:String(error).slice(0,300)})}
    finally{db.close()}
  }
  postMessage({kind:"result",rows,runtimeMs});
};
