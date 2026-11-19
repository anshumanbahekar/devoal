"""Check the account dialog and OAuth wiring without using provider credentials."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import expect, sync_playwright


def verify():
    dist = Path(__file__).resolve().parents[1] / "apps/prototype/dist"
    handler = partial(SimpleHTTPRequestHandler, directory=dist)
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server, sync_playwright() as playwright:
        Thread(target=server.serve_forever, daemon=True).start()
        browser = playwright.chromium.launch(channel="chrome")
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.route("https://fonts.googleapis.com/**", lambda route: route.abort())
        config = {}
        page.route("**/firebase-config.json", lambda route: route.fulfill(json=config))
        url = f"http://127.0.0.1:{server.server_port}/#interview"
        page.goto(url)
        entry = page.locator("#account-button")
        entry.click()
        expect(page.get_by_role("dialog", name="Sign in or sign up")).to_be_visible()
        expect(page.get_by_role("status").filter(has_text="awaiting setup")).to_be_visible()
        for name in ["Google", "GitHub"]:
            expect(page.get_by_role("button", name=f"Continue with {name}")).to_be_disabled()
        page.get_by_role("button", name="Continue as guest").click()
        expect(entry).to_be_focused()

        config.update(dict.fromkeys(["apiKey", "projectId", "authDomain", "appId"], "test"))
        modules = {
            "firebase-app.js": "export const initializeApp = () => ({});",
            "firebase-auth.js": """
                const auth = {currentUser:null};
                let listener;
                export const getAuth = () => auth;
                export const onAuthStateChanged = (_, fn) => {listener = fn; fn(null)};
                export class GoogleAuthProvider {id = 'Google'}
                export class GithubAuthProvider {id = 'GitHub'}
                export async function signInWithPopup(_, provider) {
                    if (window.blockPopup) throw {code:'auth/popup-blocked'};
                    auth.currentUser = {uid:provider.id, displayName:provider.id+' learner'};
                    listener(auth.currentUser);
                }
                export async function signOut() {auth.currentUser=null; listener(null)}
            """,
            "firebase-firestore.js": """
                export const getFirestore = () => ({});
                export const doc = (_, ...path) => path.join('/');
                export async function getDoc() {throw Error('Offline')}
                export function setDoc() {window.unexpectedCloudWrite = true}
                export const serverTimestamp = () => 0;
            """,
        }
        def serve_module(route):
            route.fulfill(content_type="application/javascript", headers={"Access-Control-Allow-Origin": "*"},
                          body=modules[route.request.url.rsplit("/", 1)[1]])
        page.route("https://www.gstatic.com/firebasejs/**", serve_module)
        page.reload()
        entry.click()
        google = page.get_by_role("button", name="Continue with Google")
        page.evaluate("window.blockPopup = true")
        google.click()
        expect(page.locator("#auth-status")).to_contain_text("Allow pop-ups")
        expect(google).to_be_enabled()
        page.evaluate("window.blockPopup = false")
        for provider in ["Google", "GitHub"]:
            page.get_by_role("button", name=f"Continue with {provider}").click()
            expect(page.locator("#auth-description")).to_contain_text(provider + " learner")
            expect(page.locator("#auth-status")).to_contain_text("retry cloud sync")
            page.get_by_role("button", name="Sign out", exact=True).click()
            expect(entry).to_have_text("Sign in")
            assert not page.evaluate("Boolean(window.unexpectedCloudWrite)")
            entry.click()
        browser.close()
        server.shutdown()


if __name__ == "__main__":
    verify()
