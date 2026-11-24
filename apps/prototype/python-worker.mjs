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
from time import perf_counter
data = json.loads(__dv_payload)
scope = {}
rows = []
failure = ""
runtime_ms = 0.0
try:
    started = perf_counter()
    try:
        exec(data["code"], scope)
    finally:
        runtime_ms += (perf_counter() - started) * 1000
    function = scope[data["function"]]
    for case in data["tests"]:
        try:
            args = copy.deepcopy(case["args"])
            started = perf_counter()
            try:
                actual = function(*args)
            finally:
                runtime_ms += (perf_counter() - started) * 1000
            rows.append({"ok": actual == case["expected"], "actual": repr(actual)[:300], "expected": repr(case["expected"])[:300]})
        except Exception as error:
            rows.append({"ok": False, "actual": type(error).__name__ + ": " + str(error)[:250], "expected": repr(case["expected"])[:300]})
except Exception:
    rows = []
    failure = traceback.format_exc(limit=2)[-600:]
json.dumps({"rows": rows, "error": failure, "runtimeMs": runtime_ms})
`);
    postMessage({kind:"result",result:JSON.parse(result)});
  }catch(error){postMessage({kind:"error",error:String(error).slice(0,600)})}
};
