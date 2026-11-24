"""Check appearance persistence, OS mode, mobile layout and themed workspaces."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright,expect

def assert_readable(page, state):
    # Resolve modern color(srgb) values too; parsing RGB strings misses color-mix.
    issues=page.evaluate(r'''() => {
        const ctx=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
        const colors=new Map(), backgrounds=new Map();
        const rgba=value=>{
            if(colors.has(value))return colors.get(value);
            ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);
            const p=Array.from(ctx.getImageData(0,0,1,1).data);p[3]/=255;colors.set(value,p);return p;
        };
        const blend=(fg,bg)=>fg.slice(0,3).map((v,i)=>v*fg[3]+bg[i]*(1-fg[3]));
        const background=el=>{
            if(!el)return [248,250,255];
            if(backgrounds.has(el))return backgrounds.get(el);
            const s=getComputedStyle(el),base=blend(rgba(s.backgroundColor),background(el.parentElement));
            const gradient=s.backgroundImage.match(/rgba?\([^)]*\)/);
            const color=gradient?blend(rgba(gradient[0]),base):base;
            backgrounds.set(el,color);return color;
        };
        const lum=c=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
        const issues=[];
        for(const el of document.querySelectorAll('body *')){
            if(el.closest('svg,[aria-hidden=true],[hidden]')||el.matches('script,style,:disabled'))continue;
            if(!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))continue;
            if(!Array.from(el.childNodes).some(n=>n.nodeType===3&&n.textContent.trim())&&!el.matches('input,textarea,select'))continue;
            const box=el.getBoundingClientRect(),s=getComputedStyle(el);
            if(box.width<1||box.height<1||rgba(s.color)[3]===0)continue;
            const bg=background(el),fg=blend(rgba(s.color),bg),a=lum(bg),b=lum(fg);
            const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
            if(ratio<4.5)issues.push({text:(el.value||el.textContent).trim().slice(0,60),selector:el.id||el.className||el.tagName,ratio:ratio.toFixed(2)});
        }
        return issues;
    }''')
    assert not issues, (state,issues)

def verify():
    dist=Path(__file__).resolve().parents[1]/'apps/prototype/dist'
    with ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=dist)) as server,sync_playwright() as p:
        Thread(target=server.serve_forever,daemon=True).start()
        browser=p.chromium.launch(channel='chrome')
        page=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce',color_scheme='light')
        page.route('https://fonts.googleapis.com/**',lambda route:route.abort())
        page.route('**/firebase-config.json',lambda route:route.fulfill(json={}))
        page.add_init_script('localStorage.setItem("dv-st",JSON.stringify({pl:{skipped:true}}))')
        base=f'http://127.0.0.1:{server.server_port}/'
        page.goto(base+'#library')
        expect(page.locator('html')).to_have_attribute('data-theme','dark')
        theme=page.get_by_label('Color theme',exact=True)
        theme.focus()
        page.keyboard.press('ArrowDown')
        page.keyboard.press('Enter')
        expect(page.locator('html')).to_have_attribute('data-theme','light')
        page.reload()
        expect(theme).to_have_value('light')
        assert page.evaluate('getComputedStyle(document.documentElement).colorScheme')=='light'
        for route in ['courses','library','problem/javascript/sum','problem/python/sum-positive','problem/sql/active-members','interview','plan','mock','prog','resources','roadmap','play','tutor','quiz','lang/python/0']:
            page.goto(base+'#'+route)
            expect(page.locator('.view.on')).to_be_visible()
            page.wait_for_load_state('networkidle')
            for width in [320,390,768,1360]:
                page.set_viewport_size({'width':width,'height':844})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(route,width)
                assert_readable(page,(route,width))
        page.goto(base+'#library')
        assert page.locator('.library-filters select').first.evaluate('(el)=>getComputedStyle(el).colorScheme')=='light'
        page.goto(base+'#tutor')
        page.locator('#pin').fill('Explain a loop')
        send=page.locator('.t-sd')
        expect(send).to_be_enabled()
        assert send.evaluate('(el)=>getComputedStyle(el).color')=='rgb(255, 255, 255)'
        page.goto(base+'#mock')
        page.locator('.mk-card').first.get_by_role('button',name='Start mock').click()
        page.locator('#mk-answer').fill('Cache redirects and store links in a database.')
        assert_readable(page,'mock answer')
        page.get_by_role('button',name='Finish and review',exact=True).click()
        page.locator('.mk-checks input').first.check()
        assert_readable(page,'mock review')
        page.get_by_role('button',name='Save review',exact=True).click()
        assert_readable(page,'mock history')
        page.goto(base+'#problem/sql/active-members')
        page.locator('#sql-editor').fill('SELECT name FROM members WHERE active = 1 ORDER BY name;')
        page.get_by_role('button',name='Run SQL tests',exact=True).click()
        expect(page.locator('.sql-result')).to_contain_text('All datasets passed')
        assert_readable(page,'SQL result table')
        page.locator('#sql-editor').fill('SELECT name FROM members ORDER BY name;')
        page.get_by_role('button',name='Run SQL tests',exact=True).click()
        expect(page.locator('.sql-result')).to_have_class('sql-result failed')
        page.locator('.sql-result details').first.locator('summary').click()
        assert_readable(page,'SQL expected rows')
        page.set_viewport_size({'width':320,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'SQL result mobile'
        page.goto(base+'#lang/python/0')
        page.get_by_role('button',name='Solution',exact=True).click()
        assert_readable(page,'lesson solution diff')
        page.locator('#kbtn').click()
        expect(page.locator('.kp')).to_be_visible()
        assert_readable(page,'search palette')
        page.keyboard.press('Escape')
        page.locator('#account-button').click()
        expect(page.locator('.dv-auth')).to_be_visible()
        assert_readable(page,'sign in dialog')
        page.keyboard.press('Escape')
        page.set_viewport_size({'width':390,'height':844})
        page.goto(base+'#problem/javascript/sum')
        page.locator('#pcode').fill('function sum(nums) { return nums.reduce((a,b)=>a+b,0) }')
        page.get_by_role('button',name='Run tests',exact=True).click()
        expect(page.locator('#pres .run-insights')).to_be_visible()
        assert_readable(page,'JavaScript run results')
        assert page.locator('#pcode').evaluate('(el)=>getComputedStyle(el).color')=='rgb(23, 34, 53)'
        page.evaluate('document.querySelector(".toasts")?.remove()')
        preview=dist.parents[2]/'.git'
        page.locator('#pres .run-insights').screenshot(path=str(preview/'runtime-light-mobile.png'))
        page.goto(base+'#courses')
        page.screenshot(path=str(preview/'theme-light-mobile.png'))
        page.set_viewport_size({'width':1360,'height':950})
        page.screenshot(path=str(preview/'theme-light-desktop.png'))
        theme.select_option('system')
        page.emulate_media(color_scheme='dark')
        expect(page.locator('html')).to_have_attribute('data-theme','dark')
        page.emulate_media(color_scheme='light')
        expect(page.locator('html')).to_have_attribute('data-theme','light')
        page.reload()
        expect(theme).to_have_value('system')
        theme.select_option('dark')
        page.reload()
        expect(page.locator('html')).to_have_attribute('data-theme','dark')
        browser.close()
        server.shutdown()

if __name__=='__main__':verify()
