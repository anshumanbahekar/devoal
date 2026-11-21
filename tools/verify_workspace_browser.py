"""Exercise problem notes, reversible code restores, discovery and attempt links."""
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright, expect


def verify():
    dist = Path(__file__).resolve().parents[1] / 'apps/prototype/dist'
    problems = json.loads((dist / 'library.json').read_text())['problems']
    with ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=dist)) as server, sync_playwright() as p:
        Thread(target=server.serve_forever, daemon=True).start()
        browser = p.chromium.launch(channel='chrome')
        page = browser.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        page.route('**/firebase-config.json', lambda route: route.fulfill(json={}))
        base = f'http://127.0.0.1:{server.server_port}/'
        for language, editor_id in [('javascript', 'pcode'), ('python', 'python-editor'), ('sql', 'sql-editor')]:
            problem = next(row for row in problems if row['language'] == language)
            page.goto(base + f'#problem/{language}/{problem["id"]}')
            article = page.locator('.view.on article')
            editor = page.locator('#' + editor_id)
            expect(editor).to_be_visible()
            article.get_by_text('My notes', exact=True).click()
            note = article.locator('.workspace-note')
            expect(note).to_have_value('')
            note.fill('Use a map <script>window.bad=true</script> ' + language)
            article.get_by_text('Solution checkpoints', exact=True).click()
            original = editor.input_value()
            article.get_by_label('Checkpoint name').fill('First approach')
            article.get_by_role('button', name='Save checkpoint', exact=True).click()
            editor.fill('alternative draft')
            article.get_by_role('button', name='Restore First approach', exact=True).click()
            expect(editor).to_have_value(original)
            expect(article.get_by_role('button', name='Restore Before restoring First approach')).to_be_attached()
            page.reload()
            expect(page.locator('#' + editor_id)).to_have_value(original)
            expect(page.locator('.view.on .workspace-note')).to_have_value('Use a map <script>window.bad=true</script> ' + language)
            assert not page.evaluate('Boolean(window.bad)')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')

        page.goto(base + '#library')
        expect(page.get_by_label('Topic', exact=True)).to_be_visible()
        topic = problems[0]['topic']
        page.get_by_label('Topic', exact=True).select_option(topic)
        expect(page.locator('.library-row')).to_have_count(sum(row['topic'] == topic for row in problems))
        page.get_by_label('Sort by', exact=True).select_option('hardest')
        page.reload()
        expect(page.get_by_label('Topic', exact=True)).to_have_value(topic)
        expect(page.get_by_label('Sort by', exact=True)).to_have_value('hardest')
        page.get_by_role('button', name='Clear filters', exact=True).click()
        due = next(row for row in problems if row['language'] == 'sql')
        attempt = {'id': 'sql:' + due['id'], 'at': 1700000000000, 'passed': False,
                   'source': 'sql-practice', 'reviewAt': 1700000001000, 'testsPassed': 0, 'testsTotal': 2}
        page.evaluate('(row)=>localStorage.setItem("dv-attempts.v1",JSON.stringify([row]))', attempt)
        page.reload()
        expect(page.locator('.library-row').first).to_contain_text(due['title'])
        page.goto(base + '#plan')
        history = page.locator('.attempt-history')
        expect(history).to_contain_text(due['title'])
        history.get_by_role('link').first.click()
        expect(page.locator('#sql-root h3')).to_contain_text(due['title'])
        page.goto(base + '#prog')
        with page.expect_download() as pending:
            page.get_by_role('button', name='Export backup', exact=True).click()
        data = json.loads(Path(pending.value.path()).read_text())['data']
        assert len(json.loads(data['dv-problem-notes.v1'])) == 3
        assert len(json.loads(data['dv-code-checkpoints.v1'])) == 3
        browser.close()
        server.shutdown()


if __name__ == '__main__':
    verify()
