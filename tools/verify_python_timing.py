"""Run the Python worker's exact test harness locally, including measured errors."""
import ast
import json
from pathlib import Path

source=(Path(__file__).resolve().parents[1]/'apps/prototype/python-worker.mjs').read_text()
harness=source.split('pyodide.runPythonAsync(`',1)[1].split('`);',1)[0]
tree=ast.parse(harness)
body=compile(ast.Module(body=tree.body[:-1],type_ignores=[]),'<worker-harness>','exec')
result=compile(ast.Expression(tree.body[-1].value),'<worker-result>','eval')
for code,passed in [('def total(nums): return sum(nums)',True),('def total(nums): raise ValueError("test")',False),('def total(',False)]:
    namespace={'__dv_payload':json.dumps({'code':code,'function':'total','tests':[{'args':[[1,2,3]],'expected':6}]})}
    exec(body,namespace)
    output=json.loads(eval(result,namespace))
    assert isinstance(output['runtimeMs'],(float,int)) and output['runtimeMs']>=0
    assert (not output['error'] and all(row['ok'] for row in output['rows'])) == passed
print('Python worker harness timing, passing code, runtime errors and syntax errors verified')
