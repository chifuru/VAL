const vm=require('node:vm'),fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const before=cp.execFileSync('git',['show','afacce577195e77f914cadcc5f3f03b4d0e44aff:lifegame-desktop/src/ecology/hash.js'],{encoding:'utf8'}),after=fs.readFileSync('src/ecology/hash.js','utf8'),rows=[];
for(const [name,source] of [['before',before],['after',after]]){
 const context=vm.createContext({TextEncoder,performance});vm.runInContext(source,context);
 const r=vm.runInContext(`(()=>{let sum=0;for(let i=0;i<1000;i++)sum+=EcoHash.hash('日本語🌊','move',i,'id'+i,[i%80,i%56]);const start=performance.now();sum=0;for(let i=0;i<20000;i++)sum+=EcoHash.hash('日本語🌊','move',i,'id'+i,[i%80,i%56]);return {sum,ms:performance.now()-start};})()`,context);
 rows.push({name,...r});
}
assert.equal(rows[0].sum,rows[1].sum);
const H=require(process.cwd()+'/src/ecology/hash.js');for(const text of ['', '🌊\ud800日本語', 'long'.repeat(400000)])assert.equal(H.portableSHA256(text),H.sha256(text));
console.log(JSON.stringify({environment:'same Node V8 VM, portable SHA for both; microbenchmark, not whole-game speed',rows,sameRandomSequence:true,largeUnicodeDigests:true},null,2));
