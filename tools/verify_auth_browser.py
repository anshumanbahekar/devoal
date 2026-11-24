"""Check the account dialog and OAuth wiring without using provider credentials."""
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import expect, sync_playwright
from verify_theme_browser import assert_readable


def verify():
    dist = Path(__file__).resolve().parents[1] / "apps/prototype/dist"
    handler = partial(SimpleHTTPRequestHandler, directory=dist)
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server, sync_playwright() as playwright:
        Thread(target=server.serve_forever, daemon=True).start()
        browser = playwright.chromium.launch(channel="chrome")
        page = browser.new_page(viewport={"width": 390, "height": 844}, reduced_motion='reduce')
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
                    auth.currentUser = {uid:provider.id, displayName:provider.id+' learner', email:provider.id.toLowerCase()+'@example.test', emailVerified:true, photoURL:'https://avatars.example.test/'+provider.id+'.svg', providerData:[{providerId:provider.id.toLowerCase()+'.com'}], metadata:{creationTime:'2026-01-01T00:00:00Z',lastSignInTime:'2026-11-24T00:00:00Z'}};
                    sessionStorage.setItem('test-user', JSON.stringify(auth.currentUser)); listener(auth.currentUser);
                }
                export async function updateProfile(user, values) {
                    if(window.failProfile) throw {code:'auth/network-request-failed'};
                    Object.assign(user, values);
                    sessionStorage.setItem('test-user', JSON.stringify(user));
                }
                export async function signOut() {
                    if(window.deferSignout) await new Promise(resolve=>window.finishSignout=resolve);
                    auth.currentUser=null; sessionStorage.removeItem('test-user'); listener(null);
                }
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
        page.route("https://avatars.example.test/Google.svg", lambda route: route.fulfill(content_type="image/svg+xml", body='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="blue"/></svg>'))
        page.route("https://avatars.example.test/GitHub.svg", lambda route: route.abort())
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
            expect(page.locator("#auth-profile")).to_be_visible()
            expect(page.locator(".profile-provider")).to_have_count(1)
            expect(page.locator(".profile-provider")).to_contain_text(provider)
            expect(page.get_by_label("About you", exact=False)).to_have_value("")
            expect(page.locator(".profile-verification")).to_have_text("Email verified")
            if provider == "Google":
                expect(page.locator("#account-avatar img")).to_be_visible()
            else:
                expect(page.locator("#account-avatar img")).to_have_count(0)
                expect(page.locator("#account-avatar")).to_have_text("GL")
            page.get_by_label("Display name", exact=True).fill(provider + " coder")
            page.get_by_label("About you", exact=False).fill('Learning <img src=x onerror="window.badProfile=true"> ' + provider)
            page.get_by_label("Focus language", exact=True).select_option("sql")
            page.get_by_label("Daily goal", exact=True).select_option("5")
            page.get_by_label("LinkedIn username", exact=True).fill('https://linkedin.com/in/learner')
            page.get_by_role("button", name="Save changes", exact=True).click()
            expect(page.locator(".profile-feedback")).to_contain_text('Enter usernames only')
            page.get_by_label("LinkedIn username", exact=True).fill('anshumanbahekar')
            page.get_by_label("X username", exact=True).fill('devoal_dev')
            page.evaluate("window.failProfile = true")
            page.get_by_role("button", name="Save changes", exact=True).click()
            expect(page.locator(".profile-feedback")).to_contain_text("Check your connection")
            assert page.evaluate('localStorage.getItem("dv-profile.v1")') is None
            page.evaluate("window.failProfile = false")
            page.get_by_role("button", name="Save changes", exact=True).click()
            expect(page.locator(".profile-feedback")).to_have_text("Profile saved.")
            expect(entry).to_have_attribute("aria-label", "Account settings for " + provider + " coder")
            expect(page.get_by_role('link',name='X profile: devoal_dev',exact=True)).to_have_attribute('href','https://x.com/devoal_dev')
            expect(page.get_by_role('link',name='LinkedIn profile: anshumanbahekar',exact=True)).to_have_attribute('href','https://www.linkedin.com/in/anshumanbahekar')
            expect(page.locator('.profile-social-links a')).to_have_count(2)
            for mode in ['light','dark']:
                page.evaluate('(mode)=>document.documentElement.dataset.theme=mode',mode)
                if mode == 'light':
                    for width in [320,390,1360]:
                        page.set_viewport_size({'width':width,'height':844})
                        assert_readable(page,('signed-in profile',provider,width))
                        assert page.locator('#auth-dialog').evaluate('(el)=>el.scrollWidth<=el.clientWidth'),width
                    page.set_viewport_size({'width':390,'height':844})
                    page.locator('#auth-dialog').evaluate('(el)=>el.scrollTop=250')
                    header_box=page.locator('.dv-auth-head').bounding_box()
                    dialog_box=page.locator('#auth-dialog').bounding_box()
                    assert abs(header_box['y']-dialog_box['y'])<=2,(header_box,dialog_box)
                page.locator('#auth-dialog').evaluate('(el)=>el.scrollTop=0')
                page.locator('#auth-dialog').screenshot(path=str(dist.parents[2]/'.git'/('profile-'+mode+'-mobile.png')))
            with page.expect_download() as pending:
                page.locator("#auth-profile").get_by_role("button", name="Export backup", exact=True).click()
            backup = json.loads(Path(pending.value.path()).read_text())
            saved = json.loads(backup['data']['dv-profile.v1'])
            assert saved['language'] == 'sql' and saved['goal'] == 5 and provider in saved['bio']
            assert saved['xUsername'] == 'devoal_dev' and saved['linkedinUsername'] == 'anshumanbahekar'
            page.get_by_role("button", name="Done", exact=True).click()
            page.goto(url.replace('#interview', '#courses'))
            expect(page.locator('#today')).to_contain_text('0 of 5 done')
            expect(page.locator('#today').get_by_role('link',name='Continue SQL',exact=True)).to_have_attribute('href', '#lang/sql/0')
            page.reload()
            entry.click()
            expect(page.get_by_label("Display name", exact=True)).to_have_value(provider + " coder")
            expect(page.get_by_label("Focus language", exact=True)).to_have_value("sql")
            expect(page.get_by_label("X username", exact=True)).to_have_value('devoal_dev')
            assert not page.evaluate('Boolean(window.badProfile)')
            assert page.evaluate('document.querySelector("#auth-dialog").scrollWidth <= document.querySelector("#auth-dialog").clientWidth')
            assert page.evaluate('localStorage.getItem("dv-practice-code")') is None
            page.get_by_role('button',name='View progress',exact=True).click()
            expect(page.locator('#v-prog')).to_be_visible()
            entry.click()
            page.evaluate('(provider)=>localStorage.setItem("dv-practice-code",JSON.stringify({draft:provider}))', provider)
            page.evaluate('window.deferSignout = true')
            page.get_by_role("button", name="Sign out", exact=True).click()
            expect(page.get_by_role('button', name='Save changes', exact=True)).to_be_disabled()
            page.wait_for_function('typeof window.finishSignout === "function"')
            page.evaluate('window.finishSignout()')
            expect(entry).to_have_text("Sign in")
            assert page.evaluate('localStorage.getItem("dv-practice-code")') is None
            assert page.evaluate('localStorage.getItem("dv-profile.v1")') is None
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
