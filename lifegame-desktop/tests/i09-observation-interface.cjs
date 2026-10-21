'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
  const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/i09-observation-interface'),root=path.resolve('src'),checks=[],errors=[],measurements={};
  await fs.mkdir(out,{recursive:true});
  const server=http.createServer(async(req,res)=>{try{
    const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');
    let data=await fs.readFile(file);
    if(file===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__I09_RENDERER__=renderer;').replace('lastChartPaint=performance.now();','lastChartPaint=performance.now();(window.__I09_CHART_PAINTS__||=[]).push({at:lastChartPaint,turn:world?.turn});'));
    res.end(data);
  }catch{res.writeHead(404).end();}});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  let browser,passed=false,sourceSignature;
  const check=(v,name)=>{assert(v,name);checks.push(name);};
  try{
    browser=await chromium.launch({headless:true,...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1460,height:1030}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
    await page.addInitScript(()=>{
      const arc=CanvasRenderingContext2D.prototype.arc,clear=CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.arc=function(...a){if(this.canvas.id==='current-donut')(window.__I09_RING_ARCS__||=[]).push(a);return arc.apply(this,a);};
      CanvasRenderingContext2D.prototype.clearRect=function(...a){if(this.canvas.id==='current-donut')window.__I09_RING_ARCS__=[];return clear.apply(this,a);};
    });
    await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);sourceSignature=await page.evaluate(()=>EcoReplayVersion);
    check(!await page.locator('#graphs-panel').isVisible(),'setup hides the live three-graph region');
    check(await page.locator('#individual-list,#detail-hold').count()===0,'individual table and the second pause control are removed');
    check(await page.locator('#graphs-panel').evaluate(e=>e.tagName==='SECTION'&&!e.querySelector(':scope > summary')),'three graphs have no folding control');
    check(await page.locator('#saved-analysis-values').evaluate(e=>e.closest('#results-analysis')!==null),'CSV and long aggregate explanations are confined to saved-result analysis');
    const config=await page.evaluate(()=>{const c=__LIFE_TEST__.readConfig();return {...c,seed:'i09/interface',terrainSeed:'i09/map',width:40,height:28,initial:64,lineages:'manual',selected:['solar','swarm','crystal'],mapId:'river',observationMode:'custom',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'standard',locks:[]},enabled:{main:true,plant:true,fungus:true,prey:true,P:true,Q:true}};});
    await page.evaluate(c=>{window.__I09_BASE_CONFIG__=c;__LIFE_TEST__.prepare(c);if(!document.body.classList.contains('observatory'))document.getElementById('focus-view').click();for(let i=0;i<3;i++)__LIFE_TEST__.step();__LIFE_TEST__.stop();},config);
    const layout=async()=>page.evaluate(()=>{const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};return {map:box('board'),summary:box('current-summary'),graphs:box('graphs-panel'),population:box('graph-stacked'),phase:box('composition-phases'),sex:box('composition-sex'),age:box('composition-ages'),ecology:box('graph-relations'),donut:box('current-donut'),documentWidth:document.documentElement.scrollWidth,viewport:innerWidth};});
    measurements.standard=await layout();
    await page.screenshot({path:path.join(out,'interface-layout-preflight.png')});
    check(await page.locator('#graphs-panel .graph-grid > article').count()===3,'three full-period graph panels remain present together');
    for(const id of ['graph-stacked','composition-phases','composition-sex','composition-ages','graph-relations'])check(await page.locator('#'+id).isVisible(),'live graph is visible: '+id);
    check(process.env.I09_LAYOUT_PREFLIGHT==='1'||measurements.standard.population.height>=95&&measurements.standard.phase.height>=34&&measurements.standard.sex.height>=34&&measurements.standard.age.height>=34,'population and all three composition histories have readable height');
    check(measurements.standard.documentWidth<=measurements.standard.viewport+1,'standard layout has no horizontal document overflow');
    check((process.env.I09_LAYOUT_PREFLIGHT==='1'||measurements.standard.map.height>=200)&&measurements.standard.graphs.x>=measurements.standard.map.right-2,'map and permanent graphs use distinct columns with adequate map height');
    check(await page.locator('#current-summary .current-relationships,#current-summary .current-biomass,#current-summary .current-composition').count()===3,'relationships biomass and composition stay within one summary');
    check(await page.locator('#current-donut').evaluate(e=>e.width===720&&e.height>=600),'donut uses a larger native bitmap rather than a stretched tiny canvas');
    const ring=await page.evaluate(()=>{const arcs=window.__I09_RING_ARCS__||[],span=r=>arcs.filter(a=>a[2]===r).reduce((n,a)=>n+a[4]-a[3],0),row=__LIFE_TEST__.observations().rows.at(-1);return {inner:span(151),outer:span(207),total:row.current.total,groups:row.current.groups.reduce((n,g)=>n+g.count,0),species:Object.values(row.current.counts).reduce((a,b)=>a+b,0),aria:document.getElementById('current-donut').getAttribute('aria-label')};});
    check(Math.abs(ring.inner-Math.PI*2)<1e-7&&Math.abs(ring.outer-Math.PI*2)<1e-7&&ring.total===ring.groups&&ring.groups===ring.species,'inner and outer rings both use the same complete population denominator');
    check(ring.aria.includes('内側は生物グループ')&&ring.aria.includes('外側は系統')&&ring.aria.includes('同じ全生物が分母'),'ring headings and common denominator are explained');
    for(const target of ['all','main','plant','prey','fungus','P','Q','solar']){await page.selectOption('#graph-species',target);check((await page.locator('#graph-stacked').getAttribute('aria-label')).includes('0–3T'),'all-turn graph can display '+target);}
    await page.selectOption('#graph-species','main');
    const selected=await page.evaluate(()=>{const w=__LIFE_TEST__.snapshot().world,o=w.organisms.find(a=>a.slot==='main');__LIFE_TEST__.select(o.cell,o.id);return {id:o.id,cell:o.cell};});
    check(await page.locator('#inspector-details').isVisible()&&!await page.locator('#graphs-panel').isVisible(),'selecting an individual switches the sidebar to details');
    await page.click('#inspector-tab-key');check(await page.locator('#inspector-key #species-key').isVisible()&&!await page.locator('#inspector-details').isVisible(),'symbol and current population catalogue shares the right sidebar');
    check(await page.locator('#species-key .species-group').count()===6,'population key keeps the existing six classifications');
    await page.locator('#species-key [data-group="main"] [data-highlight-group]').check();check(await page.evaluate(()=>[...document.querySelectorAll('#species-key [data-group="main"] .map-key-item:not([hidden]) [data-highlight]')].every(i=>i.checked)),'group check highlights every living main lineage');
    await page.locator('#species-key [data-group="main"] .map-key-item:not([hidden]) [data-highlight]').first().uncheck();check(await page.locator('#species-key [data-group="main"] [data-highlight-group]').evaluate(i=>i.indeterminate),'group check shows partial selection');
    await page.click('#clear-highlights');check(await page.evaluate(()=>__LIFE_TEST__.snapshot().view.highlights.length)===0,'clear button removes individual and group highlights together');
    await page.click('#inspector-tab-details');check(await page.locator('#inspector-details').isVisible(),'manual tab switch restores the selected individual');
    const baseline=await page.evaluate(()=>({world:JSON.stringify(__LIFE_TEST__.snapshot().world),raw:JSON.stringify(__LIFE_TEST__.observations().snapshot())}));
    await page.locator('#display-load').evaluate(e=>e.open=true);await page.click('#inspector-tab-key');await page.locator('.map-key-extra').evaluate(e=>e.open=true);await page.check('#names-prey');check(await page.evaluate(()=>__LIFE_TEST__.snapshot().view.names.prey),'existing class name control updates the same renderer state');await page.click('#inspector-tab-details');
    await page.click('#display-maximum');let state=await page.evaluate(()=>__LIFE_TEST__.snapshot());
    check(!state.view.motion&&!state.view.effects&&state.view.actionMarks&&!state.view.statusMarks&&state.view.interactionSimplify&&Object.values(state.view.names).every(v=>!v),'maximum mode omits optional effects labels and status while retaining action marks');
    await page.click('#detail-view');await page.evaluate(()=>__LIFE_TEST__.draw());state=await page.evaluate(()=>__LIFE_TEST__.snapshot());
    check(state.render.mode==='detail'&&!state.view.simplified,'maximum mode does not turn detailed creatures into symbols');
    await page.uncheck('#display-simple-background');check(await page.evaluate(()=>!__LIFE_TEST__.snapshot().view.interactionSimplify)&&(await page.locator('#display-load-state').innerText())==='個別設定','background simplification can be individually disabled after maximum mode');
    await page.uncheck('#display-action-marks');check(await page.evaluate(()=>!__LIFE_TEST__.snapshot().view.actionMarks),'action marks can be disabled independently');await page.check('#display-action-marks');
    await page.click('#display-normal');state=await page.evaluate(()=>__LIFE_TEST__.snapshot());check(state.view.motion&&state.view.effects&&state.view.actionMarks&&state.view.statusMarks&&!state.view.interactionSimplify&&(await page.locator('#display-load-state').innerText())==='通常','normal preset restores detailed presentation settings');
    check(await page.evaluate(b=>JSON.stringify(__LIFE_TEST__.snapshot().world)===b.world&&JSON.stringify(__LIFE_TEST__.observations().snapshot())===b.raw,baseline),'display presets and individual switches preserve the complete world and every turn observation');
    await page.locator('#display-load').evaluate(e=>e.open=false);await page.locator('.map-key-extra').evaluate(e=>e.open=false);await page.click('#close-species');await page.click('#fit');await page.screenshot({path:path.join(out,'interface-standard.png')});
    await page.evaluate(s=>__LIFE_TEST__.select(s.cell,s.id),selected);await page.click('#detail-view');await page.screenshot({path:path.join(out,'interface-near.png')});
    const rawRuns=[];for(const mode of ['normal','maximum','custom']){
      await page.evaluate(c=>__LIFE_TEST__.prepare(c),config);await page.locator('#display-load').evaluate(e=>e.open=true);
      if(mode==='custom'){await page.click('#display-maximum');await page.uncheck('#display-simple-background');await page.check('#motion');}else await page.click('#display-'+mode);
      rawRuns.push(await page.evaluate(()=>{for(let i=0;i<4;i++)__LIFE_TEST__.step();__LIFE_TEST__.stop();return {fingerprint:__LIFE_TEST__.fingerprint(),snapshot:JSON.stringify(__LIFE_TEST__.observations().snapshot())};}));
    }
    check(rawRuns.every(r=>r.fingerprint===rawRuns[0].fingerprint&&r.snapshot===rawRuns[0].snapshot),'four committed turns produce identical fingerprints and complete raw observations under normal maximum and individual settings');
    await page.click('#display-maximum');
    const cadence=await page.evaluate(()=>{
      window.__I09_CHART_PAINTS__=[];document.getElementById('start').click();const before=__LIFE_TEST__.observations().rows.length;
      for(let i=0;i<3;i++)__LIFE_TEST__.step();const fast=[...window.__I09_CHART_PAINTS__],after=__LIFE_TEST__.observations().rows.length;
      __LIFE_TEST__.stop();const stopped={label:document.getElementById('graph-range').textContent,turn:__LIFE_TEST__.snapshot().world.turn};
      const w=__LIFE_TEST__.snapshot().world,o=w.organisms.find(o=>o.slot==='main');__LIFE_TEST__.select(o.cell,o.id);
      return {before,after,fast,stopped,selectedLabel:document.getElementById('graph-range').textContent};
    });
    measurements.controlledFastCommitCadence=cadence;
    check(cadence.after===cadence.before+3&&cadence.fast.length<=1,'controlled rapid committed turns keep every raw row while low-frequency charts coalesce redraws');
    check(cadence.stopped.label===`0–${cadence.stopped.turn}T`&&cadence.selectedLabel===cadence.stopped.label,'manual stop and individual selection immediately show the latest committed graph');
    await page.click('#display-normal');await page.locator('#display-load').evaluate(e=>e.open=false);
    await page.evaluate(c=>{__LIFE_TEST__.prepare(c);for(let i=0;i<4;i++)__LIFE_TEST__.step();__LIFE_TEST__.stop();},config);
    const boundaries=await page.evaluate(()=>{const history=__LIFE_TEST__.observations(),last=history.rows.at(-1),fixture={metadata:history.metadata,rows:Array.from({length:502},(_,turn)=>{const r=structuredClone(last);r.turn=turn;r.relationship.turn=turn;return r;})};return [0,100,101,400,500,501].map(turn=>{const m=EcoRelationshipNetwork.build(fixture,turn),html=EcoRelationshipNetwork.render(m,{symbols:EcoRenderer.symbolPaths,colors:Object.fromEntries(history.metadata.species.map(s=>[s.id,EcoRenderer.highlightColor(s.id)])),species:history.metadata.species}),doc=new DOMParser().parseFromString(html,'text/html');return {turn,first:m.current.first,last:m.current.last,cards:doc.querySelectorAll('.relationship-card').length,past:doc.querySelectorAll('.relationship-past').length};});});
    measurements.syntheticBoundaryFixture=boundaries;check(boundaries.every(r=>r.cards===3&&r.past===0),'saved relationship model retains focused relation cards without period thumbnails');
    check(boundaries.find(r=>r.turn===100).first===1&&boundaries.find(r=>r.turn===101).first===101&&boundaries.find(r=>r.turn===501).first===501,'archived raw intervals retain their original boundaries');
    await page.setViewportSize({width:780,height:1000});await page.evaluate(()=>__LIFE_TEST__.refresh());measurements.narrow=await layout();
    check(measurements.narrow.documentWidth<=781,'narrow layout avoids horizontal document overflow');for(const id of ['graph-stacked','composition-phases','composition-sex','composition-ages','graph-relations'])check(await page.locator('#'+id).isVisible(),'narrow vertical layout retains graph '+id);
    await page.screenshot({path:path.join(out,'interface-narrow.png'),fullPage:true});await page.setViewportSize({width:1460,height:1030});
    await page.evaluate(()=>__LIFE_TEST__.finish());const record=(await page.evaluate(()=>__LIFE_TEST__.records()))[0];check(!!record,'final result can be saved from the redesigned observation screen');
    const full=await page.evaluate(id=>__LIFE_TEST__.archive().get(id),record.id);check(full.observation.rows.length===5&&full.observation.definitions.relationship==='relationship-network-observed/1'&&full.observation.relationshipIntervals,'saved result retains full turns and versioned relationship intervals');
    await page.click('#open-results');await page.locator('[data-analyze="'+record.id+'"]').click();await page.waitForSelector('#results-analysis:not([hidden])');
    check(await page.locator('#results-analysis #graphs-panel').isVisible()&&await page.locator('#saved-analysis-values').isVisible(),'saved result exposes graphs and numerical analysis in the result dialog');
    check(await page.locator('#results-analysis #current-summary').count()===1&&await page.locator('#results-analysis #relationship-network').count()===0,'saved result uses a compact summary without three relation cards');
    await page.screenshot({path:path.join(out,'interface-saved-result.png')});await page.click('#close-results');
    check(await page.locator('#inspector-graphs #graphs-panel').count()===1&&await page.locator('.observation-overview #current-summary').count()===1,'closing saved analysis restores live graph and summary locations');
    await page.click('#change-world');check(!await page.locator('#graphs-panel').isVisible(),'returning to setup hides live graphs without losing history');
    check(await page.evaluate(()=>__LIFE_TEST__.observations().rows.length)===5,'returning to setup retains all committed raw turns');
    await page.click('#cancel-settings');check(await page.locator('#graphs-panel').isVisible(),'cancelling setup restores the same graph panel');
    const legacy=await page.evaluate(async()=>{
      let w=EcoEngine.create({seed:'i09/old-relationship-missing',width:40,height:28,initial:16,lineages:'manual',selected:['solar','swarm'],landscape:'templates',mapId:'river',ageModel:'life/1',ecologyRevision:'observation/4.1'});
      const h=EcoObservations.create(w.config,EcoReplayVersion,{species:EcoState.activeSpecies(w)});h.append(w);
      for(let i=0;i<2;i++){w=EcoEngine.step(w);h.append(w);}const record=__LIFE_TEST__.archive().capture(w,'legacy-without-network',h.snapshot());await __LIFE_TEST__.archive().save(record);
      return {id:record.id,signature:record.signature,final:record.finalFingerprint};
    });
    await page.click('#open-results');await page.locator('[data-analyze="'+legacy.id+'"]').click();await page.waitForSelector('#results-analysis:not([hidden])');
    check((await page.locator('#saved-network-data').textContent()).includes('原値がありません'),'old saved results show missing relation measurements rather than invented present-day paths');
    await page.click('#close-results');await page.evaluate(id=>__LIFE_TEST__.replay(id),legacy.id);
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.relationshipModel===undefined&&__LIFE_TEST__.observations().rows[0].relationship===undefined),'old replay preserves the absence of the new relationship model');
    await page.evaluate(()=>{__LIFE_TEST__.step();__LIFE_TEST__.step();__LIFE_TEST__.stop();});check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===legacy.final,'old recorded endpoint remains exactly reproducible');
    check(await page.evaluate(()=>EcoArt.errors.length===0),'all adopted image assets still load');check(errors.length===0,'no browser exceptions or native dialogs');passed=true;
    console.log(JSON.stringify({checks:checks.length,errors,sourceSignature}));
  }catch(error){errors.push(String(error));throw error;}finally{
    await fs.writeFile(path.join(out,'ui-report.json'),JSON.stringify({passed,checks,errors,sourceSignature,measurements,scope:'Linux Chromium at1460x1030 and780x1000; actual short4T worlds and IndexedDB save/analysis, raw data equality across display settings; 100T boundaries use explicitly synthetic repeated-row display fixtures, not500T ecological survival'},null,2)+'\n');
    await browser?.close();await new Promise(r=>server.close(r));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
