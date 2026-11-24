"""Exercise real JS/SQLite timing and explicitly mocked Python worker UI states."""
import json
import math
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import expect, sync_playwright


def verify():
    dist = Path(__file__).resolve().parents[1] / 'apps/prototype/dist'
    handler = partial(SimpleHTTPRequestHandler, directory=dist)
    with ThreadingHTTPServer(('127.0.0.1', 0), handler) as server, sync_playwright() as p:
        Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_port}/'
        browser = p.chromium.launch(channel='chrome')
        page = browser.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        page.route('**/firebase-config.json', lambda route: route.fulfill(json={}))
        page.add_init_script("""
            const RealWorker = Worker;
            window.workerTerminations = 0;
            window.Worker = class extends RealWorker {
                terminate() { window.workerTerminations++; super.terminate(); }
            };
        """)

        def attempts():
            return page.evaluate('JSON.parse(localStorage.getItem("dv-attempts.v1") || "[]")')

        def assert_measurement(row, problem_id, passed):
            assert row['id'] == problem_id
            assert row['passed'] is passed
            assert row['benchmark'] == 'browser-v1'
            assert isinstance(row['runtimeMs'], (int, float))
            assert math.isfinite(row['runtimeMs']) and 0 <= row['runtimeMs'] < 10_000

        # Only comparable successful runs contribute to the personal speed comparison.
        page.goto(base + '#problem/sql/active-members')
        prior = [
            {'id': 'sql:active-members', 'at': 1_700_000_000_000 + n, 'passed': passed,
             'source': 'sql-practice', 'testsPassed': 2 if passed else 0, 'testsTotal': 2,
             'runtimeMs': runtime, 'benchmark': benchmark}
            for n, (passed, runtime, benchmark) in enumerate([
                (True, 1_000_000, 'browser-v1'), (True, 0, 'browser-v1'),
                (False, 2_000_000, 'browser-v1'), (True, 1_000_000, 'different-suite'),
            ])
        ]
        prior.append(dict(prior[0], id='sql:top-products'))
        page.evaluate('(rows) => localStorage.setItem("dv-attempts.v1", JSON.stringify(rows))', prior)
        page.locator('#sql-editor').fill('SELECT name FROM members WHERE active = 1 ORDER BY name;')
        page.get_by_role('button', name='Run SQL tests', exact=True).click()
        sql_output = page.locator('#sql-output')
        expect(sql_output.locator('.sql-result')).to_contain_text('All datasets passed')
        assert_measurement(attempts()[-1], 'sql:active-members', True)
        expect(sql_output.locator('.run-comparison')).to_have_text('Faster than 50% of your previous successful runs')
        expect(sql_output.locator('.run-sample')).to_contain_text('Compared with 2 successful runs')
        expect(sql_output.get_by_role('img', name='Runtime in milliseconds for 4 recent measured runs.', exact=False)).to_be_attached()
        sql_output.get_by_text('View run data', exact=True).click()
        expect(sql_output.locator('.run-data tbody tr')).to_have_count(4)
        expect(sql_output.locator('.run-data caption')).to_have_text('Recent measured runs for this problem')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert 'users' not in sql_output.locator('.run-comparison').inner_text().lower()

        # Query errors still measure time spent executing the failing query.
        page.locator('#sql-editor').fill('SELECT FROM members;')
        page.get_by_role('button', name='Run SQL tests', exact=True).click()
        expect(sql_output.locator('.sql-result')).to_contain_text('0 of 2 datasets passed')
        expect(sql_output.locator('.sql-error').first).to_contain_text('syntax error')
        assert_measurement(attempts()[-1], 'sql:active-members', False)
        expect(sql_output.locator('.run-comparison')).to_have_text('Complete all tests to compare successful runs.')

        # JavaScript uses the real sandbox runner, not a synthesized result.
        page.goto(base + '#problem/javascript/sum')
        page.locator('#pcode').fill('function sum(nums) { return nums.reduce((total, n) => total + n, 0); }')
        page.get_by_role('button', name='Run tests', exact=True).click()
        expect(page.locator('#pres .run-verdict')).to_have_text('All tests passed')
        assert_measurement(attempts()[-1], 'sum', True)
        expect(page.locator('#pres .run-comparison')).to_have_text('First successful benchmark')
        page.locator('#pcode').fill('function sum(nums) { throw new Error("Deliberate test error"); }')
        page.get_by_role('button', name='Run tests', exact=True).click()
        expect(page.locator('#pres .run-verdict')).to_have_text('Needs another try')
        assert_measurement(attempts()[-1], 'sum', False)

        # A timed submission keeps its measured result visible after advancing and on reload.
        page.evaluate("""() => localStorage.setItem('dv-interview.v1', JSON.stringify({
            mode:'foundation',startedAt:Date.now(),questionStartedAt:Date.now(),questions:['sum','reverse'],
            current:0,results:[],drafts:{},hints:{},notes:{}
        }))""")
        page.goto(base+'#interview')
        page.reload()
        expect(page.locator('#ip-code')).to_be_visible()
        page.locator('#ip-approach').fill('Accumulate each value.')
        page.locator('#ip-code').fill('function sum(nums) { return nums.reduce((a,b)=>a+b,0); }')
        page.get_by_role('button',name='Submit answer',exact=True).click()
        expect(page.locator('.ip-submission .run-verdict')).to_have_text('All tests passed')
        expect(page.locator('.ip-meta')).to_contain_text('Problem 2 of 2')
        assert_measurement(attempts()[-1], 'sum', True)
        page.reload()
        expect(page.locator('.ip-submission .run-insights')).to_be_visible()
        page.locator('#ip-code').fill('function reverse(str) { return [...str].reverse().join(""); }')
        page.get_by_role('button',name='Submit answer',exact=True).click()
        expect(page.locator('.ip-report')).to_contain_text('2 of 2 solved')
        page.locator('.ip-report .ip-submission').first.locator(':scope > summary').click()
        expect(page.locator('.ip-report .run-insights').first).to_be_visible()
        expect(page.locator('.ip-notes').first).to_contain_text('Accumulate each value.')

        # Mock only the Python worker transport, so these assertions do not depend on CDN access.
        # This fixture checks UI/error/race behavior, not Pyodide execution speed.
        page.route('**/python-worker.js*', lambda route: route.fulfill(content_type='application/javascript', body="""
            postMessage({kind: 'ready'});
            onmessage = event => {
                const {code, tests} = event.data.payload;
                if (code === 'mock:timeout') return;
                setTimeout(() => {
                    const failure = code === 'mock:error';
                    postMessage({kind: 'result', result: {
                        rows: failure ? [] : tests.map(test => ({ok:true, actual:JSON.stringify(test.expected), expected:JSON.stringify(test.expected)})),
                        error: failure ? 'SyntaxError: mock <bad> code' : '', runtimeMs: 2.25
                    }});
                }, 200);
            };
        """))
        page.goto(base + '#problem/python/sum-positive')
        page.locator('#python-editor').fill('mock:success')
        page.get_by_role('button', name='Run Python tests', exact=True).click()
        expect(page.locator('#python-output .python-result')).to_contain_text('All tests passed')
        assert_measurement(attempts()[-1], 'py:sum-positive', True)
        assert attempts()[-1]['runtimeMs'] == 2.25
        page.locator('#python-editor').fill('mock:error')
        page.get_by_role('button', name='Run Python tests', exact=True).click()
        expect(page.locator('#python-output .python-result')).to_contain_text('SyntaxError: mock <bad> code')
        assert_measurement(attempts()[-1], 'py:sum-positive', False)
        count_before = len(attempts())
        page.locator('#python-editor').fill('mock:timeout')
        page.get_by_role('button', name='Run Python tests', exact=True).click()
        expect(page.locator('#python-output .run-unavailable')).to_have_text('Unavailable', timeout=10_000)
        expect(page.locator('#python-output')).to_contain_text('Code exceeded the 5 second limit.')
        assert len(attempts()) == count_before

        # Resetting while a result is in flight detaches its output; it must not record a stale run.
        page.locator('#python-editor').fill('mock:success')
        terminated_before = page.evaluate('window.workerTerminations')
        page.get_by_role('button', name='Run Python tests', exact=True).click()
        page.get_by_role('button', name='Reset code', exact=True).click()
        page.wait_for_function('(before) => window.workerTerminations > before', arg=terminated_before)
        expect(page.locator('#python-output')).to_be_empty()
        assert len(attempts()) == count_before
        assert not errors, '\n'.join(errors)
        browser.close()
        server.shutdown()


if __name__ == '__main__':
    verify()
