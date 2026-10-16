'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),E=require('./vendor/ecological-engine'),M=require('./model'),Original=require('../../../gas-fizzbuzz-webapp/src/composite/creature-engine');
async function main(){
const checks=[];const check=(v,label)=>{assert.ok(v,label);checks.push(label);};
for(const n of [1,201,580,932,1000])assert.deepEqual(E.runAll(n),Original.runAll(n));checks.push('original FizzBuzz growth parity at five seeds');
let w=M.create(),dna=JSON.stringify(w.creatures[0].bio.dna),a=M.abilities(w.creatures[0].bio);check(M.same(w.creatures[0],w.creatures[1])&&!M.same(w.creatures[0],w.creatures[2]),'same lineage is allied');
for(let i=0;i<120;i++)M.step(w);check(w.ate>0&&w.cellBirths>0,'cellular births generate actual food intake');check(w.field.some(c=>c.env!==c.baseEnv),'cellular activity changes local environments');check(JSON.stringify(w.creatures[0].bio.dna)===dna,'base DNA remains unchanged');check(M.abilities(w.creatures[0].bio).attack>a.attack,'abilities grow from actual anatomy and growth');
const s=E.initial(932),life=E.ecologicalStep(s,'fizz','tide'),ore=E.ecologicalStep(s,'buzz','heat');check(life.currentEnvironment==='tide'&&ore.currentEnvironment==='heat'&&life.foods.fizz===1&&ore.foods.buzz===1,'world food/environment override fixed original schedule');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'evidence');await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+rel);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const ext=path.extname(file);res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png'}[ext]||'application/octet-stream'));res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));server.unref();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try{const page=await browser.newPage({viewport:{width:1580,height:1120}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:'+server.address().port+'/lifegame-desktop/design/ecosystem-mock/index.html');await page.waitForFunction(()=>window.__ECO_MOCK__?.snapshot().ready,{timeout:90000});
check((await page.evaluate(()=>__ECO_MOCK__.snapshot().world.creatures.length))===8,'eight real FizzBuzz specimens render');
await page.screenshot({path:path.join(out,'01-initial.png'),fullPage:true});
await page.locator('#fast').click();await page.waitForFunction(()=>__ECO_MOCK__.snapshot().world.turn===120&&!__ECO_MOCK__.snapshot().busy,{timeout:90000});
check((await page.evaluate(()=>__ECO_MOCK__.snapshot().world.creatures[0].meals))>0,'world simulation advances with actual meals');
check((await page.locator('#trace').textContent()).includes('摂取'),'intake trace displays');
await page.screenshot({path:path.join(out,'02-growth.png'),fullPage:true});
await page.locator('#food-kind').selectOption('fizzbuzz');await page.locator('#env-kind').selectOption('void');await page.locator('#feed').click();await page.waitForFunction(()=>!__ECO_MOCK__.snapshot().busy);
check((await page.evaluate(()=>__ECO_MOCK__.snapshot().world.turn))===121,'comparison intervention advances a real turn');
await page.locator('#play').click();await page.waitForFunction(()=>__ECO_MOCK__.snapshot().world.turn>=123);await page.locator('#play').click();check(!(await page.evaluate(()=>__ECO_MOCK__.snapshot().running)),'observation pauses');
await page.locator('#origin').selectOption('birth');await page.locator('#reset').click();await page.waitForFunction(()=>!__ECO_MOCK__.snapshot().busy&&__ECO_MOCK__.snapshot().world.birth);check((await page.evaluate(()=>__ECO_MOCK__.snapshot().world.creatures[0].bio.current))===0,'birth mode starts without prior feeding');
await page.setViewportSize({width:390,height:844});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow viewport fits');await page.screenshot({path:path.join(out,'03-narrow.png'),fullPage:true});
check(errors.length===0,'no renderer exceptions');
const report={scope:'A-specification mock behavior checks; not production acceptance',checks,errors,model:{turn:w.turn,cellBirths:w.cellBirths,ate:w.ate,abilityBefore:a,abilityAfter:M.abilities(w.creatures[0].bio)},browser:await browser.version()};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(r=>server.close(r));}}
main().catch(e=>{console.error(e);process.exitCode=1;});
