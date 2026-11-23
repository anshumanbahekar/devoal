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
                const auth = {currentUser:JSON.parse(sessionStorage.getItem('test-user')||'null')};
                let listener;
                export const getAuth = () => auth;
                export const onAuthStateChanged = (_, fn) => {listener = fn; fn(auth.currentUser)};
                export class GoogleAuthProvider {id = 'Google'}
                export class GithubAuthProvider {id = 'GitHub'}
                export async function signInWithPopup(_, provider) {
                    if (window.blockPopup) throw {code:'auth/popup-blocked'};
                    auth.currentUser = {uid:provider.id, displayName:provider.id+' learner'};
                    sessionStorage.setItem('test-user', JSON.stringify(auth.currentUser)); listener(auth.currentUser);
                }
                export async function signOut() {auth.currentUser=null; sessionStorage.removeItem('test-user'); listener(null)}
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
            assert page.evaluate('localStorage.getItem("dv-practice-code")') is None
            page.evaluate('(provider)=>localStorage.setItem("dv-practice-code",JSON.stringify({draft:provider}))', provider)
            page.get_by_role("button", name="Sign out", exact=True).click()
            expect(entry).to_have_text("Sign in")
            assert page.evaluate('localStorage.getItem("dv-practice-code")') is None
            assert not page.evaluate("Boolean(window.unexpectedCloudWrite)")
            expect(page.locator("#auth-google")).to_be_enabled()
            entry.click()

        # Cloud hydration must refresh the editor even when its next write stalls.
        modules["firebase-firestore.js"] = """
            window.cloudWrites = [];
            window.pendingWrites = [];
            export const getFirestore = () => ({});
            export const doc = (_, ...path) => path.join('/');
            export async function getDoc() {
                sessionStorage.setItem('test-cloud-reads', String(Number(sessionStorage.getItem('test-cloud-reads') || 0) + 1));
                const result = {exists:()=>true, data:()=>({state:JSON.parse(sessionStorage.getItem('test-cloud-state'))})};
                if (sessionStorage.getItem('test-defer-read')) return new Promise(resolve=>{window.finishCloudRead=()=>resolve(result)});
                return result;
            }
            export function setDoc(path, data) {
                window.cloudWrites.push({path, data});
                return new Promise(resolve=>window.pendingWrites.push(resolve));
            }
            export const serverTimestamp = () => 0;
        """
        remote_code = "function sum(nums) { return nums.reduce((a, b) => a + b, 0); }"
        page.evaluate("""code => {
            sessionStorage.setItem('test-user', JSON.stringify({uid:'Google', displayName:'Google learner'}));
            sessionStorage.setItem('test-cloud-state', JSON.stringify({'dv-practice-code':JSON.stringify({sum:code})}));
            localStorage.setItem('dv-last-uid', 'Google');
        }""", remote_code)
        page.goto(url.replace('#interview', '#problem/javascript/sum'))
        page.reload()
        page.wait_for_function("Number(sessionStorage.getItem('test-cloud-reads')) >= 2 && window.cloudWrites?.length === 1")
        expect(page.locator('#pcode')).to_have_value(remote_code)

        # Let the normal sync timer wait on the pending write, then change ownership
        # before the corresponding storage event can reload the current page.
        page.wait_for_timeout(5100)
        page.evaluate("""() => {
            localStorage.setItem('dv-last-uid', 'GitHub');
            localStorage.setItem('dv-practice-code', JSON.stringify({sum:'GitHub private draft'}));
            window.pendingWrites.shift()();
        }""")
        page.wait_for_timeout(100)
        assert page.evaluate('window.cloudWrites.length') == 1
        assert page.evaluate('JSON.parse(window.cloudWrites[0].data.state["dv-practice-code"]).sum') == remote_code

        # An older account's delayed read must also leave the new owner's data alone.
        page.evaluate("""() => {
            sessionStorage.setItem('test-defer-read', 'true');
            localStorage.setItem('dv-last-uid', 'Google');
        }""")
        page.reload()
        page.wait_for_function('typeof window.finishCloudRead === "function"')
        page.evaluate("""() => {
            localStorage.setItem('dv-last-uid', 'GitHub');
            localStorage.setItem('dv-practice-code', JSON.stringify({sum:'GitHub private draft'}));
            window.finishCloudRead();
        }""")
        page.wait_for_timeout(100)
        assert page.evaluate('localStorage.getItem("dv-last-uid")') == 'GitHub'
        assert page.evaluate('JSON.parse(localStorage.getItem("dv-practice-code")).sum') == 'GitHub private draft'
        assert page.evaluate('window.cloudWrites.length') == 0
        browser.close()
        server.shutdown()


if __name__ == "__main__":
    verify()
