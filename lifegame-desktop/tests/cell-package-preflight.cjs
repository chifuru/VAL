'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
(async()=>{
 const sourceCommit=process.argv[2];assert(/^[a-f0-9]{40}$/.test(sourceCommit||''),'Pass the verified source commit SHA.');
 const asar=await import('@electron/asar'),root=path.resolve(__dirname,'..'),out=path.join(root,'operations/evidence/cell-release-preflight-v1');await fs.mkdir(out,{recursive:true});
 const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),files=[];
 async function walk(dir){for(const e of await fs.readdir(path.join(root,dir),{withFileTypes:true})){const p=path.posix.join(dir,e.name);assert(!e.isSymbolicLink(),'Unexpected source symlink: '+p);if(e.isDirectory())await walk(p);else{assert(e.isFile(),'Unexpected source entry: '+p);files.push(p);}}}
 await walk('src');files.sort();
 const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')),
  metadata={name:pkg.name,productName:pkg.productName,version:pkg.version,main:pkg.main,author:'VALIS project',private:true};
 assert(files.includes(pkg.main),'Desktop entry must be in the payload');
 const html=await fs.readFile(path.join(root,'src/Index.html'),'utf8'),references=[...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
 for(const ref of references){assert(!/^(?:[a-z]+:|\/\/)/i.test(ref),'Nonlocal entry reference: '+ref);assert(files.includes(path.posix.normalize('src/'+ref.split(/[?#]/)[0])),'Missing/case-mismatched entry reference: '+ref);}
 const previous=path.join(root,'dist/LifeGame-Windows-x64/resources/app.asar');let prior={present:false};
 try{
  await fs.access(previous);const oldPackage=JSON.parse(asar.extractFile(previous,'package.json').toString()),mismatches=[],missing=[];
  for(const p of files){let bytes;try{bytes=asar.extractFile(previous,p);}catch{missing.push(p);continue;}if(hash(bytes)!==hash(await fs.readFile(path.join(root,p))))mismatches.push(p);}
  prior={present:true,version:oldPackage.version,matchesCurrentSource:missing.length===0&&mismatches.length===0&&oldPackage.version===pkg.version,mismatches,missing};
 }catch(error){if(error.code!=='ENOENT')throw error;}
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'lifegame-preflight-')),stage=path.join(temporary,'stage'),archive=path.join(temporary,'candidate.asar');let payload;
 try{
  await fs.mkdir(stage);await fs.cp(path.join(root,'src'),path.join(stage,'src'),{recursive:true});await fs.writeFile(path.join(stage,'package.json'),JSON.stringify(metadata,null,2));
  await asar.createPackage(stage,archive);assert.deepEqual(JSON.parse(asar.extractFile(archive,'package.json').toString()),metadata);
  const actual=asar.listPackage(archive).map(p=>p.replace(/^[/\\]+/,'').replaceAll('\\','/')).filter(p=>!asar.statFile(archive,p).files).sort();
  assert.deepEqual(actual,[...files,'package.json'].sort(),'Archive includes exactly runtime source and projected metadata');
  let sourceBytes=0;for(const p of files){const bytes=await fs.readFile(path.join(root,p));assert.equal(hash(asar.extractFile(archive,p)),hash(bytes),'Payload mismatch: '+p);sourceBytes+=bytes.length;}
  const bytes=await fs.readFile(archive);payload={sourceFiles:files.length,sourceBytes,archiveFiles:actual.length,bytes:bytes.length,sha256:hash(bytes),allSourceBytesMatch:true,projectedMetadataMatch:true,desktopEntry:pkg.main,htmlReferences:references.length,temporaryRemoved:true,windowsRuntimeBundled:false};
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
 let electronAvailable=false;try{await fs.access(path.join(root,'node_modules/electron/dist',process.platform==='win32'?'electron.exe':'electron'));electronAvailable=true;}catch{}
 const report={success:true,sourceCommit,productVersion:pkg.version,electronVersion:pkg.devDependencies.electron,biologicalSignature:(await fs.readFile(path.join(root,'src/ecology/replay-version.js'),'utf8')).match(/[a-f0-9]{64}/)[0],payload,existingLocalArchive:prior,host:process.platform,nativeElectronAvailable:electronAvailable,windowsExecuted:false,newDistributionCreated:false,scope:'Temporary ASAR byte comparison only. Does not package or execute a Windows application.'};
 await fs.writeFile(path.join(out,'package-preflight.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({success:true,files:payload.sourceFiles,allSourceBytesMatch:true,previousVersion:prior.version,previousMatches:prior.matchesCurrentSource}));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
