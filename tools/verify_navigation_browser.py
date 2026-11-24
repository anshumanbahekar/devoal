"""Verify lesson links, browser history, and truthful clipboard feedback."""
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
        page = browser.new_page(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        page.route('**/firebase-config.json', lambda route: route.fulfill(json={}))
        page.add_init_script("""
            window.copiedText = [];
            window.rejectCopy = false;
            Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {
                writeText: async text => {
                    if (window.rejectCopy) throw new DOMException('Clipboard denied', 'NotAllowedError');
                    window.copiedText.push(text);
                }
            }});
        """)

        # Invalid deep links must recover before attempting to render an undefined lesson.
        for index in ['-1', '1.5', 'Infinity']:
            page.goto(base + '#lang/javascript/' + index)
            expect(page).to_have_url(base + '#lang/javascript/0')
            expect(page.locator('#lg .les-k')).to_have_text('Quick start · 1 of 4')
            expect(page.locator('#lg .les h3')).to_have_text('let, const and template strings.')

        page.locator('#lg .pnb.nx').click()
        expect(page).to_have_url(base + '#lang/javascript/1')
        expect(page.locator('#lg .les h3')).to_have_text('map, filter and reduce.')
        page.reload()
        expect(page.locator('#lg .les h3')).to_have_text('map, filter and reduce.')
        page.go_back()
        expect(page).to_have_url(base + '#lang/javascript/0')
        expect(page.locator('#lg .les-k')).to_have_text('Quick start · 1 of 4')
        page.go_forward()
        expect(page.locator('#lg .les-k')).to_have_text('Quick start · 2 of 4')
        page.locator('#lg .pnb:not(.nx)').click()
        expect(page).to_have_url(base + '#lang/javascript/0')

        page.locator('#lg .lt[data-i="2"]').click()
        expect(page).to_have_url(base + '#lang/javascript/2')
        expect(page.locator('#lg .les h3')).to_have_text('Change a page from code.')
        page.locator('#lg .lt[data-topic="Variables"]').click()
        expect(page).to_have_url(base + '#lang/javascript/t/variables')
        expect(page.locator('#lg .les h3')).to_have_text('Variables')
        page.reload()
        expect(page.locator('#lg .les h3')).to_have_text('Variables')
        page.go_back()
        expect(page).to_have_url(base + '#lang/javascript/2')
        expect(page.locator('#lg .les h3')).to_have_text('Change a page from code.')

        page.goto(base + '#lang/javascript/0')
        copy = page.get_by_role('button', name='Copy code', exact=True)
        copy.click()
        expect(copy).to_have_text('Copied')
        assert page.evaluate('window.copiedText') == [
            'const site = "coal";\nlet visits = 0;\nvisits++;\nconsole.log(site + " " + visits);'
        ]
        page.get_by_role('button', name='Solution', exact=True).click()
        copy.click()
        page.wait_for_function('window.copiedText.length === 2')
        assert page.evaluate('window.copiedText[1]') == 'const name = "Anshu";\nconsole.log(`Hello, ${name}!`);'

        # Start with a fresh button so a prior successful copy cannot mask false feedback.
        page.reload()
        page.evaluate('window.rejectCopy = true')
        copy.click()
        expect(page.locator('.toast').last).to_have_text('Could not copy. Select the code and copy it manually.')
        expect(copy).to_have_text('Copy')
        expect(copy).to_be_enabled()
        assert page.evaluate('window.copiedText') == []
        assert not errors, '\n'.join(errors)
        browser.close()
        server.shutdown()


if __name__ == '__main__':
    verify()
