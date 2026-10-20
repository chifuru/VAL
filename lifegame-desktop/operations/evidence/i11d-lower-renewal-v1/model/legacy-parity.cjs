'use strict';
// Portable short compatibility check. The caller supplies an extracted baseline
// ecology directory; neither source tree nor saved observations are modified.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../../..'),argv=process.argv.slice(2),at=argv.indexOf('--baseline-root');
if(at<0||!argv[at+1])throw Error('Usage: node legacy-parity.cjs --baseline-root /path/to/803f677/src/ecology');
const baseline=path.resolve(argv[at+1]),target=path.join(root,'src/ecology'),B=require(path.join(baseline,'observation-model.js')),N=require(path.join(target,'observation-model.js')),BO=require(path.join(baseline,'observations.js')),NO=require(path.join(target,'observations.js'));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),signature=dir=>vm.runInNewContext(fs.readFileSync(path.join(dir,'replay-version.js'),'utf8')+'\nEcoReplayVersion');
const sourceHashes=dir=>Object.fromEntries(['observation-model.js','observation-modules.js','observations.js','replay-version.js','hash.js','landscape.js','map-data.js','map-templates.js'].map(name=>[name,hash(fs.readFileSync(path.join(dir,name)))]));
const config={seed:'i11c/legacy-profiles',width:16,height:12,initial:24,lineages:'manual',selected:['solar','ryouki','swarm'],placement:'natural',ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1',populationRegulation:{version:1},producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',informationModel:'persistent/1',relationshipModel:'network/1',generationModel:'diverse/1',generationSettings:{mode:'manual',profile:'standard'},enabled:{main:true,plant:true,fungus:true,prey:true,P:true,Q:true}};
const result={schema:'i11d-legacy-parity/1',baselineCommit:'803f677',baselineSignature:signature(baseline),currentSignature:signature(target),model:'generated-product-eight-profiles',config,turns:[0,4],versions:[null,'survival/1','survival/2','survival/3'],matchedWorlds:0,matchedFullStates:0,matchedObservationRows:0,matchedAllObservations:0,runs:[],sourceHashes:{baseline:sourceHashes(baseline),current:sourceHashes(target),runner:hash(fs.readFileSync(__filename))},scope:'Four old versions; all eight advantage profiles; five consecutive states each. Exact complete biological world, fingerprint, finite accounting, and separate baseline/current product O snapshots. Not a long-term survival or performance certification.'};
try{
 for(const balanceModel of [undefined,'survival/1','survival/2','survival/3'])for(let bits=0;bits<8;bits++){
  const flags={producer:!!(bits&1),waterbug:!!(bits&2),hyperparasite:!!(bits&4)},old=B.model(flags),now=N.model(flags),c={...config,...(balanceModel?{balanceModel}:{})},version=balanceModel==='survival/3'?result.baselineSignature:balanceModel==='survival/2'?'ada68bb8fff06b5e6125b11e952e2c7be43e31967cee7c364ea8449739018a97':balanceModel?'95b7405d3e4513acabf2194ed0ed1b9eb79c9ffd566bcc9e0b5f1edc3ca1b889':'a7cac02a9d7382b478919b40c44823ce0d6bb0325b3e551adb1236908c92774d';
  let a=old.create(structuredClone(c)),b=now.create(structuredClone(c));const ha=BO.create(a.config,version,{species:old.S.activeSpecies(a)}),hb=NO.create(b.config,version,{species:now.S.activeSpecies(b)}),run={flags,balanceModel:balanceModel??null,states:[],allObservationsSha256:null};result.runs.push(run);
  for(let turn=0;turn<=4;turn++){
   assert.deepEqual(b,a,'complete world '+String(balanceModel)+' profile'+bits+' T'+turn);result.matchedFullStates++;
   const actual=now.fingerprint(b),expected=old.fingerprint(a);assert.equal(actual,expected);result.matchedWorlds++;
   assert.deepEqual(old.invariants(a),[]);assert.deepEqual(now.invariants(b),[]);ha.append(a);hb.append(b);assert.deepEqual(hb.rows[turn],ha.rows[turn]);result.matchedObservationRows++;
   run.states.push({turn,fingerprint:actual,observationSha256:hash(JSON.stringify(hb.rows[turn]))});if(turn<4){a=old.step(a);b=now.step(b);}
  }
  const oldSnapshot=ha.snapshot(),newSnapshot=hb.snapshot();assert.deepEqual(newSnapshot,oldSnapshot);NO.restore(newSnapshot,{validateOnly:true});BO.restore(oldSnapshot,{validateOnly:true});run.allObservationsSha256=hash(JSON.stringify(newSnapshot));result.matchedAllObservations++;
 }
 assert.equal(result.matchedWorlds,160);assert.equal(result.matchedFullStates,160);assert.equal(result.matchedObservationRows,160);assert.equal(result.matchedAllObservations,32);result.passed=true;
}catch(error){result.passed=false;result.error=String(error.stack||error);process.exitCode=1;}finally{
 fs.writeFileSync(path.join(__dirname,'legacy-parity.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,worlds:result.matchedWorlds,fullStates:result.matchedFullStates,observationRows:result.matchedObservationRows,allObservationSnapshots:result.matchedAllObservations,error:result.error}));
}
