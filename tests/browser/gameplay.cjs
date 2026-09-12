const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { serveGame } = require('./server.cjs');

const OUT = '/app/tmp/audit/gameplay';

/** Read the real Phaser scene without substituting any implementation. */
async function scene(page, fn, arg) {
  return page.evaluate(({ source, arg }) => {
    const callback = (0, eval)(`(${source})`);
    return callback(window.__reflexesGameUi.getScene(), arg);
  }, { source: fn.toString(), arg });
}

/** Collect full-page visual evidence plus actual control and container geometry. */
async function capture(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const geometry = await page.evaluate(() => {
    const rect = n => n.getBoundingClientRect().toJSON();
    return { viewport: { width: innerWidth, height: innerHeight },
      controls: [...document.querySelectorAll('#game-ui-overlay button:not([hidden])')].map(n => ({key:n.dataset.uiKey || `cell${n.dataset.cellIndex}`, rect:rect(n)})),
      labels: [...document.querySelectorAll('.game-ui-text:not([hidden])')].map(n => ({key:n.dataset.uiKey, text:n.textContent, rect:rect(n)})) };
  });
  for (const {key, rect} of geometry.controls) {
    assert.ok(rect.width >= 43.9 && rect.height >= 43.9, `${name}: ${key} too small ${JSON.stringify(rect)}`);
    assert.ok(rect.x >= -0.5 && rect.right <= geometry.viewport.width + 0.5, `${name}: ${key} horizontal bounds`);
    assert.ok(rect.y >= -0.5 && rect.bottom <= geometry.viewport.height + 0.5, `${name}: ${key} vertical bounds ${rect.bottom}`);
  }
  for (const {key, rect} of geometry.labels) {
    assert.ok(rect.x >= -0.5 && rect.right <= geometry.viewport.width + 0.5, `${name}: ${key} label clipped`);
    assert.ok(rect.y >= -0.5 && rect.bottom <= geometry.viewport.height + 0.5, `${name}: ${key} label vertical bounds`);
  }
  // The visual grid and the native hit regions must agree after every resize.
  const alignment = await scene(page, s => s.cellCenters.map((cell,i) => {
    const node = s.domUi.nodes[`cell${i}`];
    return { dx:parseFloat(node.style.left)-cell.x, dy:parseFloat(node.style.top)-cell.y, size:parseFloat(node.style.width)-cell.size };
  }));
  assert.ok(alignment.every(a => Math.abs(a.dx)+Math.abs(a.dy)+Math.abs(a.size)<0.01));
  await fs.writeFile(`${OUT}/${name}.json`, JSON.stringify(geometry,null,2));
}

/** Force a lifecycle event only for deterministic boundary tests; real UI smoke is separate. */
async function visibility(page, hidden) {
  await page.evaluate(hidden => {
    Object.defineProperty(document, 'hidden', { configurable:true, value:hidden });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

/** Test native input chains, exact deadlines and teardown against real browser execution. */
(async () => {
  await fs.mkdir(OUT, {recursive:true});
  const server = await serveGame();
  const results = [];
  try {
    for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
      const browser = await engine.launch({ ...(name === 'chromium' ? {args:['--no-sandbox']} : {}) });
      try {
        const sizes = name === 'chromium' ? [[320,480],[360,640],[390,844],[768,1024]] : [[390,844]];
        for (const [width,height] of sizes) {
          const context = await browser.newContext({viewport:{width,height},deviceScaleFactor:2,hasTouch:true});
          const p = await context.newPage();
          const errors = [];
          p.on('pageerror', e=>{errors.push(e.message);console.error(`${prefix}: ${e.message}`);});
          await p.goto(`${server.origin}/reflexesGame/`);
          await p.waitForFunction(()=>window.__reflexesGameUi?.getScene()?.homePlayButton);
          const prefix = `${name}-${width}x${height}`;
          await capture(p, `${prefix}-home`);
          await p.getByRole('button',{name:'しんけん',exact:true}).click();
          assert.equal(await p.getByRole('button',{name:'しんけん',exact:true}).getAttribute('aria-pressed'),'true');
          await p.getByRole('button',{name:'おと: なし',exact:true}).click();
          assert.equal(await scene(p,s=>s.audioEnabled),true);
          await p.getByRole('button',{name:'あそぶ！',exact:true}).focus();
          await p.keyboard.press('Enter');
          assert.equal(await scene(p,s=>s.screenMode),'countdown');
          await capture(p,`${prefix}-countdown`);
          await visibility(p,true);
          const remaining = await scene(p,s=>s.startCountdownEndAt-s.roundClock.now());
          await p.waitForTimeout(150);
          assert.equal(await scene(p,s=>s.startCountdownEndAt-s.roundClock.now()),remaining);
          await visibility(p,false);
          assert.equal(await scene(p,s=>s.getSnapshotMode()),'paused');
          await p.getByRole('button',{name:'つづける',exact:true}).press('Space');
          await p.waitForFunction(()=>window.__reflexesGameUi.getScene().isRunning);
          await p.waitForFunction(()=>window.__reflexesGameUi.getScene().activeTargets.length>0);
          // Freeze only the clock source for precise fixture setup, not the game logic.
          await scene(p,s=>{const now=s.roundClock.sourceNow();s.roundClock.sourceNow=()=>now;});
          const target = await scene(p,s=>s.activeTargets[0].cellIndex);
          const cell = p.locator(`[data-cell-index="${target}"]`);
          await cell.tap();
          assert.equal(await scene(p,s=>s.score),1, 'one touch must score once');
          await scene(p,s=>{s.clearSpawnTimers();s.clearActiveTargets(false);s.createNodeTarget(0);});
          await p.locator('[data-cell-index="0"]').focus();
          await p.keyboard.press('Space');
          assert.equal(await scene(p,s=>s.score),2,'keyboard hit');
          await scene(p,s=>{s.clearSpawnTimers();s.clearActiveTargets(false);s.createNodeTarget(2);});
          await p.keyboard.press('ArrowRight');
          assert.equal(await p.locator('[data-cell-index="1"]').evaluate(n=>n===document.activeElement),true);
          await p.keyboard.press('Enter');
          assert.equal(await scene(p,s=>s.score),1,'serious wrong cell penalty');
          await p.keyboard.press('Escape');
          assert.equal(await scene(p,s=>s.isMenuOpen),true,JSON.stringify({errors,focus:await p.evaluate(()=>document.activeElement.outerHTML)}));
          const paused = await scene(p,s=>({score:s.score,time:s.roundClock.now(),targets:s.activeTargets.length,reserved:s.spawnReservationCount}));
          await capture(p,`${prefix}-pause`);
          await p.keyboard.press('Shift+Tab');
          assert.equal(await p.getByRole('button',{name:'おうちへ',exact:true}).evaluate(n=>n===document.activeElement),true);
          await visibility(p,true); await visibility(p,false);
          await p.waitForTimeout(150);
          assert.deepEqual(await scene(p,s=>({score:s.score,time:s.roundClock.now(),targets:s.activeTargets.length,reserved:s.spawnReservationCount})),paused);
          await p.getByRole('button',{name:'つづける',exact:true}).click();
          // Existing targets survive demotion; callbacks obey the new capacity.
          const tiers = await scene(p,s=>{
            const records=[];
            for(const mode of ['normal','serious']) {
              s.selectedMode=mode;
              for(const score of [0,9,10,19,20,29,30]) {
                s.score=score;s.updateTierFromScore();
                records.push([mode,score,s.tier]);
              }
            }
            s.clearSpawnTimers();s.clearActiveTargets(false);s.score=30;s.updateTierFromScore();
            [0,1,2].forEach(i=>s.createNodeTarget(i));
            s.onCellPressed(8);
            const preserved=s.activeTargets.length;
            s.handleHit(0);
            return {records,preserved,afterHit:s.activeTargets.map(t=>t.cellIndex)};
          });
          assert.equal(tiers.preserved,3);
          assert.deepEqual(tiers.afterHit,[1,2]);
          for(const [,score,tier] of tiers.records) assert.equal(tier,Math.min(4,Math.floor(score/10)+1));
          await capture(p,`${prefix}-level4`);
          const expiration = await scene(p,s=>{
            const rows=[];
            for(const mode of ['normal','serious']) {
              s.clearTimers();s.clearActiveTargets(false);s.selectedMode=mode;s.score=2;
              s.updateTierFromScore();s.countdownEndAt=s.roundClock.now()+30000;
              const expired=s.createNodeTarget(0);s.createNodeTarget(1);expired.expiresAt=s.roundClock.now();
              s.handleTargetExpired(expired);s.handleTargetExpired(expired);
              const afterMiss=s.score;
              s.onCellPressed(8);
              rows.push({mode,afterMiss,afterWrong:s.score,remaining:s.activeTargets.map(t=>t.cellIndex)});
            }
            return rows;
          });
          assert.deepEqual(expiration,[{mode:'normal',afterMiss:2,afterWrong:2,remaining:[1]},{mode:'serious',afterMiss:1,afterWrong:0,remaining:[1]}]);
          // Deadline fixtures use the actual scene methods at -1/0/+1ms.
          const boundaries = await scene(p,s=>{
            const rows=[];
            for(const offset of [-1,0,1]) {
              s.clearTimers();s.clearActiveTargets(false);s.isRunning=true;s.screenMode='playing';s.isMenuOpen=false;s.score=5;s.updateScoreText(false);
              s.countdownEndAt=s.roundClock.now()-offset;
              s.createNodeTarget(0);
              s.onCellPressed(0);
              rows.push({offset,score:s.score,mode:s.screenMode});
            }
            return rows;
          });
          assert.deepEqual(boundaries.map(r=>r.score),[6,5,5]);
          await capture(p,`${prefix}-finished`);
          await p.getByRole('button',{name:'おうちへ',exact:true}).click();
          assert.equal(await scene(p,s=>s.selectedMode),'serious');
          assert.equal(await scene(p,s=>s.audioEnabled),true);
          const leak = await scene(p,s=>{
            const before={dom:s.domUi.root.children.length,display:s.children.list.length};
            for(let i=0;i<20;i++){
              s.startGame();s.beginGameplayRound();s.clearSpawnTimers();s.createNodeTarget(0);
              s.handleHit(0);s.playLevelUpFeedback();s.openPauseMenu();s.goHome();
            }
            return {before,after:{dom:s.domUi.root.children.length,display:s.children.list.length},timers:s.spawnTimers.length+(s.gameTimer?1:0)+(s.startCountdownTimer?1:0)+(s.countdownTickTimer?1:0),targets:s.activeTargets.length,effects:s.roundEffects.size};
          });
          assert.deepEqual(leak.before,leak.after);
          assert.equal(leak.timers+leak.targets+leak.effects,0);
          assert.deepEqual(errors,[]);
          results.push({browser:name,version:browser.version(),viewport:[width,height],boundaries,expiration,leak,errors});
          await context.close();
        }
      } finally { await browser.close(); }
    }
    await fs.writeFile(`${OUT}/report.json`,JSON.stringify(results,null,2));
    console.log(`Gameplay PASS: ${results.length} browser/viewport combinations`);
  } finally { await server.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
