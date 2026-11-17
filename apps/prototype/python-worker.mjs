import {loadPyodide} from "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs";

let pyodide;
try {
  pyodide=await loadPyodide({indexURL:"https://cdn.jsdelivr.net/pyodide/v0.27.7/full/"});
  postMessage({kind:"ready"});
} catch (error) {
  postMessage({kind:"error",error:"Python runtime could not load. Check your connection and try again."});
}

onmessage=async event=>{
  if(!pyodide||event.data?.kind!=="run")return;
  try{
    pyodide.globals.set("__dv_payload",JSON.stringify(event.data.payload));
    const result=await pyodide.runPythonAsync(`
import json, copy, traceback
data = json.loads(__dv_payload)
scope = {}
rows = []
failure = ""
try:
    exec(data["code"], scope)
    function = scope[data["function"]]
    for case in data["tests"]:
        try:
            actual = function(*copy.deepcopy(case["args"]))
            rows.append({"ok": actual == case["expected"], "actual": repr(actual)[:300], "expected": repr(case["expected"])[:300]})
        except Exception as error:
            rows.append({"ok": False, "actual": type(error).__name__ + ": " + str(error)[:250], "expected": repr(case["expected"])[:300]})
except Exception:
    rows = []
    failure = traceback.format_exc(limit=2)[-600:]
json.dumps({"rows": rows, "error": failure})
`);
    postMessage({kind:"result",result:JSON.parse(result)});
  }catch(error){postMessage({kind:"error",error:String(error).slice(0,600)})}
};
