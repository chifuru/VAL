const {chromium}=require('/workspace/val-setup/fizzbuzz/node_modules/playwright');
const fs=require('node:fs'),crypto=require('node:crypto');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--disable-dev-shm-usage']});
 const c=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8766/Index.html');await p.waitForFunction(()=>document.querySelector('#partList .part-item canvas'));
 const results=[];
 await p.evaluate(()=>{window.auditCalls=[];window.google={script:{run:{withSuccessHandler(success){return {withFailureHandler(failure){return {calculateFizzBuzz(n){window.auditCalls.push({n,success,failure});}};}};}}}};});
 await p.locator('#seedInput').fill('15');await p.locator('#runButton').click();
 results.push({case:'pending-controls',runDisabled:await p.locator('#runButton').isDisabled(),pauseDisabled:await p.locator('#pauseButton').isDisabled(),skipDisabled:await p.locator('#skipButton').isDisabled(),notice:await p.locator('#notice').textContent()});
 await p.locator('#resetButton').click();await p.evaluate(()=>window.auditCalls[0].success(window.CreatureEngine.linesFor(15)));await p.waitForTimeout(100);
 results.push({case:'reset-discards-stale-success',rows:await p.locator('#fizzbuzzLog').inputValue(),runDisabled:await p.locator('#runButton').isDisabled(),mode:await p.locator('#specimenMode').textContent(),notice:await p.locator('#notice').textContent()});
 await p.locator('#seedInput').fill('5');await p.locator('#runButton').click();await p.evaluate(()=>window.auditCalls[0].failure({message:'stale failure'}));
 results.push({case:'second-request-ignores-stale-failure',notice:await p.locator('#notice').textContent(),runDisabled:await p.locator('#runButton').isDisabled()});
 await p.evaluate(()=>window.auditCalls[1].success(window.CreatureEngine.linesFor(5)));await p.waitForFunction(()=>document.querySelector('#runCount').textContent==='5 / 5');
 results.push({case:'latest-success-completes',rows:await p.locator('#fizzbuzzLog').inputValue(),notice:await p.locator('#notice').textContent()});
 await p.evaluate(()=>delete window.google);
 await p.locator('#seedInput').fill('30');await p.locator('#speedSelect').selectOption('12');await p.locator('#runButton').click();await p.waitForFunction(()=>document.querySelector('#runCount').textContent==='30 / 30');
 async function snap(){return await p.evaluate(()=>({rows:document.querySelector('#fizzbuzzLog').value,phase:document.querySelector('#phaseName').textContent,lineage:document.querySelector('#lineageName').textContent,points:document.querySelector('#pointsLabel').textContent,maturity:document.querySelector('#maturityStatus').textContent,heritage:document.querySelector('#heritageLabel').textContent,parts:document.querySelector('#partList').textContent,canvas:document.querySelector('#creatureCanvas').toDataURL()}));}
 const normal=await snap();await p.locator('#runButton').click();await p.locator('#skipButton').click();const skip=await snap();results.push({case:'normal-playback-and-skip-same',normalRows:normal.rows.split('\n').length,skipRows:skip.rows.split('\n').length,equal:JSON.stringify(normal)===JSON.stringify(skip),normalHash:hash(JSON.stringify(normal)),skipHash:hash(JSON.stringify(skip))});
 results.push({case:'uncaught-errors',errors});fs.writeFileSync('/tmp/valis-async-audit.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await b.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
