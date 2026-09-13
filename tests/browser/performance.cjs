const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');
const {serveGame}=require('./server.cjs');

/** Select a percentile from raw samples without discarding slow observations. */
function percentile(values,p){const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.ceil(sorted.length*p)-1];}

/** Compare identical cold starts and real pointer-to-next-paint opportunities. */
(async()=>{
 const root=path.resolve(__dirname,'../..');
 const old=await serveGame({root:path.join(root,'tmp/baseline-app')});
 const current=await serveGame();
 const browser=await chromium.launch({args:['--no-sandbox']});
 const results={baseline:{startup:[],tiers:{}},candidate:{startup:[],tiers:{}}};
 try{
  for(let i=0;i<10;i++)for(const [name,server] of [['baseline',old],['candidate',current]]){
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
   const p=await context.newPage();const start=performance.now();
   await p.goto(server.origin+'/reflexesGame/');
   await p.waitForFunction(()=>window.__reflexesGameUi?.getScene()?.homePlayButton);
   results[name].startup.push(performance.now()-start);await context.close();
  }
  for(const [name,server] of [['baseline',old],['candidate',current]])for(const score of [0,35]){
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
   const p=await context.newPage();await p.goto(server.origin+'/reflexesGame/');
   await p.waitForFunction(()=>window.__reflexesGameUi?.getScene()?.homePlayButton);
   await p.evaluate(score=>{
    const s=window.__reflexesGameUi.getScene();s.startGame();s.beginGameplayRound();s.score=score;s.updateTierFromScore();s.updateScoreText(false);
    window.inputSamples=[];
    document.addEventListener('pointerdown',()=>{
     const start=performance.now();const before=s.score;
     requestAnimationFrame(()=>requestAnimationFrame(()=>{if(s.score>before)window.inputSamples.push(performance.now()-start);}));
    },true);
   },score);
   const frames=await p.evaluate(()=>new Promise(resolve=>{
    const samples=[];let previous=null;
    function frame(t){if(previous!==null)samples.push(t-previous);previous=t;if(samples.length>=120)resolve(samples);else requestAnimationFrame(frame);}
    requestAnimationFrame(frame);
   }));
   for(let i=0;i<20;i++){
    const point=await p.evaluate(score=>{
     const s=window.__reflexesGameUi.getScene();s.score=score;s.updateTierFromScore();s.clearSpawnTimers();s.clearActiveTargets(false);
     for(let j=0;j<(score===0?1:3);j++)s.createNodeTarget(j);
     return s.cellCenters[0];
    },score);
    await p.mouse.click(point.x,point.y);await p.waitForTimeout(70);
   }
   const input=await p.evaluate(()=>window.inputSamples);
   assert.equal(input.length,20);
   results[name].tiers[score===0?'normal':'level4']={frames,input,frameP95:percentile(frames,.95),inputP95:percentile(input,.95)};
   await context.close();
  }
  const summary={};
  for(const name of ['baseline','candidate'])summary[name]={startupMedian:percentile(results[name].startup,.5),...Object.fromEntries(Object.entries(results[name].tiers).map(([key,value])=>[key,{frameP95:value.frameP95,inputP95:value.inputP95}]))};
  const gates={startup:summary.candidate.startupMedian<=summary.baseline.startupMedian+Math.max(summary.baseline.startupMedian*.1,100)};
  for(const tier of ['normal','level4'])for(const metric of ['frameP95','inputP95'])gates[`${tier}-${metric}`]=summary.candidate[tier][metric]<=summary.baseline[tier][metric]+Math.max(summary.baseline[tier][metric]*.1,16.7);
  await fs.writeFile('/app/tmp/audit/performance.json',JSON.stringify({browser:browser.version(),viewport:[390,844],dpr:2,renderer:'Phaser AUTO',method:'10 interleaved cold starts; 120 rAF intervals per tier; 20 real mouse inputs to second rAF (paint opportunity, not physical display latency)',summary,gates,raw:results},null,2));
  console.log(JSON.stringify({summary,gates},null,2));
  assert.ok(Object.values(gates).every(Boolean),'performance regression gate');
 }finally{await browser.close();await old.close();await current.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
