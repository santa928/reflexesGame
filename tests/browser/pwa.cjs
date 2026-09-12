const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { serveGame } = require('./server.cjs');

/** Exercise real baseline SW migration, failed installs, multiple clients and offline reload. */
(async () => {
  const root = path.resolve(__dirname, '../..');
  const baseline = path.join(root, 'tmp/baseline-app');
  await fs.access(path.join(baseline,'service-worker.js'));
  const expectedCss = await fs.readFile(path.join(root,'styles.css'),'utf8');
  const reports=[];
  for (const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
    let release='baseline';
    const server = await serveGame({transform:async(file,body)=>{
      if(release==='baseline') return fs.readFile(path.join(baseline,file));
      if(release==='failed' && file==='src/roundClock.js') throw new Error('intentional asset download failure');
      return body;
    }});
    const browser=await engine.launch(name==='chromium'?{args:['--no-sandbox']}:{});
    let context;
    let phase='baseline';
    const diagnostics=[];
    try {
      context=await browser.newContext({viewport:{width:390,height:844}});
      context.on('page', page=>{
        page.on('pageerror',error=>diagnostics.push({phase,type:'pageerror',message:error.message}));
        page.on('requestfailed',request=>diagnostics.push({phase,type:'requestfailed',url:request.url(),failure:request.failure()}));
        page.on('response',response=>{
          if(/(?:main\.js|roundClock\.js|service-worker\.js|index\.html)$/.test(response.url())) {
            diagnostics.push({phase,type:'response',url:response.url(),status:response.status(),fromServiceWorker:response.fromServiceWorker()});
          }
        });
      });
      const p=await context.newPage();
      await p.goto(`${server.origin}/reflexesGame/not-an-app.html`);
      await p.evaluate(async()=>{await caches.open('other-app-v1');});
      await p.goto(`${server.origin}/reflexesGame/`);
      await p.waitForFunction(()=>window.__reflexesGameUi?.getScene()?.homePlayButton);
      await p.evaluate(()=>navigator.serviceWorker.ready);
      await p.waitForFunction(()=>navigator.serviceWorker.controller);
      const baselineDeletesOthers=await p.evaluate(async()=>!(await caches.keys()).includes('other-app-v1'));
      assert.equal(baselineDeletesOthers,true,'baseline must reproduce cross-app deletion');
      const q=await context.newPage();
      await q.goto(`${server.origin}/reflexesGame/`);
      await q.waitForFunction(()=>window.__reflexesGameUi?.getScene()?.homePlayButton);
      await p.evaluate(async()=>{
        const unrelated=await caches.open('other-app-v1');
        await unrelated.put(new URL('./styles.css',location.href),new Response('unrelated-cache-sentinel'));
      });
      release='failed';
      phase='failed update';
      console.log(`PWA ${name}: ${phase}`);
      await p.evaluate(async()=>{
        const r=await navigator.serviceWorker.getRegistration();
        r.addEventListener('updatefound',()=>{window.failedWorker=r.installing;},{once:true});
        await r.update();
      });
      await p.waitForFunction(()=>['installed','redundant'].includes(window.failedWorker?.state));
      assert.equal(await p.evaluate(()=>window.failedWorker.state),'redundant','the failed download must actually reject the candidate install');
      assert.equal(await p.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting),false);
      assert.equal(await p.evaluate(()=>!!window.__reflexesGameUi.getScene().roundClock),false,'failed update keeps baseline running');
      release='candidate';
      phase='candidate update';
      console.log(`PWA ${name}: ${phase}`);
      await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
      await p.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
      await p.evaluate(()=>window.__reflexesGameUi.getScene().startGame());
      await p.waitForFunction(()=>window.__reflexesGameUi.getScene().isRunning);
      assert.equal(await p.evaluate(()=>!!window.__reflexesGameUi.getScene().roundClock),false,'waiting update must not replace running code');
      // Capture the waiting worker before closing clients. A fresh registration
      // snapshot can briefly expose the old active worker without its waiting
      // peer, so absence of waiting alone does not prove candidate activation.
      const observer=await context.newPage();
      await observer.goto(`${server.origin}/observer.html`);
      await observer.waitForFunction(async()=>{
        const r=await navigator.serviceWorker.getRegistration('/reflexesGame/');
        if(!r?.waiting) return false;
        window.expectedWorker=r.waiting;
        return true;
      });
      await p.close();
      assert.equal(await q.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting),true,'second old client keeps update waiting');
      await q.close();
      phase='activation';
      console.log(`PWA ${name}: ${phase}`);
      await observer.waitForFunction(async()=>{
        const r=await navigator.serviceWorker.getRegistration('/reflexesGame/');
        return r?.active===window.expectedWorker && r.active?.state==='activated';
      });
      const fresh=await context.newPage();
      phase='candidate relaunch';
      console.log(`PWA ${name}: ${phase}`);
      await fresh.goto(`${server.origin}/reflexesGame/`);
      await fresh.waitForFunction(()=>!!window.__reflexesGameUi?.getScene()?.roundClock);
      await fresh.evaluate(()=>navigator.serviceWorker.ready);
      await fresh.waitForFunction(()=>navigator.serviceWorker.controller);
      await observer.close();
      assert.equal(await fresh.evaluate(async()=>(await fetch('./styles.css')).text()),expectedCss,'read only the active app cache');
      const ownership=await fresh.evaluate(async()=>{
        const keys=await caches.keys();
        const other=await caches.open('other-app-v1');
        return {keys,sentinel:await (await other.match(new URL('./styles.css',location.href))).text()};
      });
      assert.equal(ownership.sentinel,'unrelated-cache-sentinel');
      assert.equal(ownership.keys.some(k=>k.startsWith(`pikapika-touch:${server.origin}/reflexesGame/:`)),true);
      // Exercise a scope-external request from a controlled app page.
      await fresh.evaluate(()=>fetch('/outside.txt'));
      const cacheUrls=await fresh.evaluate(async()=>{
        const key=(await caches.keys()).find(k=>k.startsWith(`pikapika-touch:${location.origin}/reflexesGame/:`));
        return (await (await caches.open(key)).keys()).map(r=>r.url);
      });
      assert.equal(cacheUrls.some(url=>url.endsWith('/outside.txt')),false);
      // Drop every real HTTP connection. This also works on Linux WebKit, where
      // context.setOffline can abort navigation before the SW gets a fetch event.
      server.setOffline(true);
      phase='offline';
      console.log(`PWA ${name}: ${phase}`);
      await fresh.reload();
      await fresh.waitForFunction(()=>!!window.__reflexesGameUi?.getScene()?.roundClock);
      await fresh.getByRole('button',{name:'あそぶ！',exact:true}).click();
      await fresh.waitForFunction(()=>window.__reflexesGameUi.getScene().isRunning);
      await fresh.screenshot({path:`/app/tmp/audit/pwa-${name}-offline.png`});
      await context.close();
      server.setOffline(false);
      // A blocked registration must not prevent online play.
      const denied=await browser.newContext({serviceWorkers:'block'});
      const online=await denied.newPage();
      await online.goto(`${server.origin}/reflexesGame/`);
      await online.getByRole('button',{name:'あそぶ！',exact:true}).click();
      await online.waitForFunction(()=>window.__reflexesGameUi.getScene().isRunning);
      reports.push({browser:name,version:browser.version(),baselineDeletesOthers,failedInstallRetainsBaseline:true,waitsForAllClients:true,offlinePlay:true,registrationBlockedOnlinePlay:true,ownership,cacheUrls});
      await denied.close();
    } catch(error) {
      const pages=[];
      for(const page of context?.pages() || []) {
        pages.push(await page.evaluate(async()=>({url:location.href,ready:document.readyState,buttons:document.querySelectorAll('button').length,hasUi:!!window.__reflexesGameUi,hasClock:!!window.__reflexesGameUi?.getScene()?.roundClock,caches:await caches.keys(),workers:(await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,active:r.active?.state,waiting:r.waiting?.state,installing:r.installing?.state}))})).catch(e=>({error:e.message})));
      }
      await fs.writeFile(`/app/tmp/audit/pwa-${name}-failure.json`,JSON.stringify({browser:name,phase,error:error.message,diagnostics,pages},null,2));
      throw error;
    } finally { await browser.close(); await server.close(); }
  }
  await fs.writeFile('/app/tmp/audit/pwa-report.json',JSON.stringify(reports,null,2));
  console.log(`PWA PASS: actual baseline migration, failed update, multiple tabs, unrelated cache, offline, registration denied (${reports.length} browsers)`);
})().catch(e=>{console.error(e);process.exitCode=1;});
