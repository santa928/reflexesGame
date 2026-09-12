const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { serveGame } = require('./server.cjs');

/** Play a real 3s preparation + 30s round without changing clocks, scores or targets. */
(async()=>{
  const server=await serveGame();
  const browser=await chromium.launch({args:['--no-sandbox']});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
    const p=await context.newPage();
    const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.goto(`${server.origin}/reflexesGame/`);
    await p.getByRole('button',{name:'あそぶ！',exact:true}).tap();
    const countdownAt=Date.now();
    await p.waitForFunction(()=>window.__reflexesGameUi.getScene().isRunning);
    const playingAt=Date.now();
    for(let i=0;i<5;i++){
      await p.waitForFunction(()=>window.__reflexesGameUi.getScene().activeTargets.length);
      const cell=await p.evaluate(()=>window.__reflexesGameUi.getScene().activeTargets[0].cellIndex);
      await p.locator(`[data-cell-index="${cell}"]`).tap();
    }
    assert.equal(await p.evaluate(()=>window.__reflexesGameUi.getScene().score),5);
    await p.getByRole('button',{name:'いちじていし',exact:true}).tap();
    const paused=await p.evaluate(()=>window.render_game_to_text());
    await p.waitForTimeout(1100);
    assert.equal(await p.evaluate(()=>window.render_game_to_text()),paused);
    await p.getByRole('button',{name:'つづける',exact:true}).tap();
    await p.waitForFunction(()=>window.__reflexesGameUi.getScene().screenMode==='finished',{},{timeout:35000});
    const finishedAt=Date.now();
    const result=await p.evaluate(()=>JSON.parse(window.render_game_to_text()));
    assert.equal(result.score,5);assert.equal(result.remainingTimeSec,0);assert.deepEqual(errors,[]);
    assert.ok(playingAt-countdownAt>=2700 && playingAt-countdownAt<4500);
    assert.ok(finishedAt-playingAt>=30000 && finishedAt-playingAt<34000);
    await p.screenshot({path:'/app/tmp/audit/live-round-finished.png'});
    await p.getByRole('button',{name:'もういちど',exact:true}).tap();
    assert.equal(await p.evaluate(()=>window.__reflexesGameUi.getScene().screenMode),'countdown');
    await fs.writeFile('/app/tmp/audit/live-round.json',JSON.stringify({countdownMs:playingAt-countdownAt,roundIncludingPauseMs:finishedAt-playingAt,result,errors},null,2));
    console.log('Live round PASS: real preparation, 5 touches, 1.1s pause, 30 active seconds, retry');
  } finally {await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
