"""Exercise the packaged Pages app through its public library and editor routes."""
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import expect, sync_playwright


def verify():
    dist = Path(__file__).resolve().parents[1] / "apps/prototype/dist"
    problems = json.loads((dist / "library.json").read_text())["problems"]
    handler = partial(SimpleHTTPRequestHandler, directory=dist)
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server, sync_playwright() as playwright:
        Thread(target=server.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{server.server_port}/"
        browser = playwright.chromium.launch(channel="chrome")
        page = browser.new_page(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
        page.route("https://fonts.googleapis.com/**", lambda route: route.abort())
        page.goto(base + "#library")
        expect(page.locator(".top")).to_have_text("Devoal by Study Sharpener")
        expect(page.locator(".library-row")).to_have_count(len(problems))
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        page.locator(".library-save").first.click()
        page.get_by_label("My practice").select_option("saved")
        expect(page.locator(".library-row")).to_have_count(1)
        page.reload()
        expect(page.locator(".library-save").first).to_have_attribute("aria-pressed", "true")
        page.get_by_role("button", name="Clear filters").click()
        page.get_by_label("Language", exact=True).select_option("sql")
        page.get_by_label("Difficulty", exact=True).select_option("Hard")
        hard_sql = [p for p in problems if p["language"] == "sql" and p["level"] == "Hard"]
        expect(page.locator(".library-row")).to_have_count(len(hard_sql))
        chosen = hard_sql[-1]
        page.get_by_role("link").filter(has_text=chosen["title"]).click()
        expect(page.locator("#sql-root h3")).to_contain_text(chosen["title"])
        page.locator("#sql-editor").fill("-- saved library draft")
        page.reload()
        expect(page.locator("#sql-editor")).to_have_value("-- saved library draft")
        page.go_back()
        expect(page.locator(".library-row")).to_have_count(len(hard_sql))
        expect(page.get_by_label("Difficulty", exact=True)).to_have_value("Hard")
        page.get_by_role("button", name="Clear filters").click()
        expect(page.locator(".library-row")).to_have_count(len(problems))
        page.get_by_label("Prep path").select_option("google")
        expect(page.locator(".library-row")).to_have_count(sum("google" in p["companies"] for p in problems))
        for language, selector in [("javascript", "#prg article h3"), ("python", "#python-root h3")]:
            chosen = next(p for p in reversed(problems) if p["language"] == language)
            page.goto(base)
            page.goto(base + f"#problem/{language}/{chosen['id']}")
            page.reload()
            expect(page.locator(selector)).to_contain_text(chosen["title"])
        browser.close()
        server.shutdown()


if __name__ == "__main__":
    verify()
