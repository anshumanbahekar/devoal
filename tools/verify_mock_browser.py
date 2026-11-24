"""Verify a mock's saved answers survive navigation, reload and self-review."""
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright, expect


def verify():
    dist = Path(__file__).resolve().parents[1] / 'apps/prototype/dist'
    scenario = json.loads((dist / 'mock-scenarios.json').read_text())[0]
    with ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=dist)) as server, sync_playwright() as p:
        Thread(target=server.serve_forever, daemon=True).start()
        browser = p.chromium.launch(channel='chrome')
        page = browser.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        page.route('**/firebase-config.json', lambda route: route.fulfill(json={}))
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        base = f'http://127.0.0.1:{server.server_port}/'
        page.goto(base + '#mock')
        page.locator('.mk-card').first.get_by_role('button', name='Start mock').click()
        expect(page.locator('#mk-clarify')).to_be_visible()
        assert not errors, errors
        responses = {
            'clarify': 'How many redirects per second?',
            'answer': 'API -> cache -> database. <script>window.badMock=true</script>',
            'tradeoffs': 'Use retries and expiration; measure redirect latency.',
        }
        for field, answer in responses.items():
            page.locator('#mk-' + field).fill(answer)
        page.goto(base + '#library')
        expect(page.locator('#library-count')).to_contain_text('problems')
        page.goto(base + '#mock')
        for field, answer in responses.items():
            expect(page.locator('#mk-' + field)).to_have_value(answer)
        page.reload()
        for field, answer in responses.items():
            expect(page.locator('#mk-' + field)).to_have_value(answer)
        responses['answer'] += '\nHandle collisions with a unique index.'
        page.locator('#mk-answer').fill(responses['answer'])
        page.get_by_role('button', name='Finish and review', exact=True).click()
        for answer in responses.values():
            expect(page.locator('.mk-response')).to_contain_text(answer)
        assert not page.evaluate('Boolean(window.badMock)')
        page.locator('.mk-checks input').first.check()
        page.locator('.mk-checks input').last.check()
        page.reload()
        expect(page.locator('#mk-timer')).to_have_text('Review')
        expect(page.locator('.mk-checks input').first).to_be_checked()
        expect(page.locator('.mk-checks input').last).to_be_checked()
        page.get_by_role('button', name='Save review', exact=True).click()
        expect(page.locator('.mk-history')).to_contain_text(scenario['title'])
        saved = page.evaluate('JSON.parse(localStorage.getItem("dv-mock-history.v1"))[0]')
        assert saved['id'] == scenario['id']
        assert saved['responses'] == responses
        assert saved['checks'] == [0, len(scenario['rubric']) - 1]
        assert page.evaluate('localStorage.getItem("dv-mock.v1")') is None
        page.locator('.mk-history').get_by_role('button', name='Try again').first.click()
        for field in responses:
            expect(page.locator('#mk-' + field)).to_have_value('')
        page.get_by_role('button', name='End without saving', exact=True).click()
        expect(page.locator('.mk-card').first).to_be_visible()
        assert len(page.evaluate('JSON.parse(localStorage.getItem("dv-mock-history.v1"))')) == 1
        assert not errors, errors
        browser.close()
        server.shutdown()


if __name__ == '__main__':
    verify()
