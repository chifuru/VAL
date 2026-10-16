'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process'),{pathToFileURL}=require('node:url');
async function main(){const dir=__dirname,root=path.resolve(dir,'../..'),stage=await fs.mkdtemp(path.join(os.tmpdir(),'lifelab-mock-'));try{
 for(const f of ['index.html','style.css','desktop.cjs','asset-config.js'])await fs.copyFile(path.join(dir,f),path.join(stage,f));
 await fs.cp(path.join(dir,'src'),path.join(stage,'src'),{recursive:true});
 await fs.cp(path.join(dir,'vendor'),path.join(stage,'vendor'),{recursive:true});
 await fs.cp(path.resolve(root,'../gas-fizzbuzz-webapp/src/assets'),path.join(stage,'assets'),{recursive:true});
 const config=await fs.readFile(path.join(stage,'asset-config.js'),'utf8');await fs.writeFile(path.join(stage,'asset-config.js'),config.replaceAll('../../../gas-fizzbuzz-webapp/src/assets/','assets/'));
 await fs.writeFile(path.join(stage,'package.json'),JSON.stringify({name:'lifelab-mock',version:'0.3.0',main:'desktop.cjs',private:true}));
 const {packager}=await import(pathToFileURL(require.resolve('@electron/packager')).href),pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
 const [folder]=await packager({dir:stage,out:path.join(dir,'dist'),name:'LifeLab-Mock',platform:'win32',arch:'x64',electronVersion:pkg.devDependencies.electron,asar:true,overwrite:true});
 await fs.copyFile(path.join(dir,'SPEC-PROPOSAL.md'),path.join(folder,'仕様まとめ.md'));
 await fs.writeFile(path.join(folder,'README.txt'),'Life Lab 03 / A仕様の認識合わせ用モック\r\nZIPをすべて展開し、LifeLab-Mock.exeを起動してください。\r\n初期は成体40体です。1ターンで繁殖、120ターンで成長・出生・死亡を観測できます。\r\n詳しい仕様と仮設定は「仕様まとめ.md」を参照してください。\r\n','utf8');
 const zip=path.join(dir,'dist/LifeLab-Mock-Windows-x64.zip');await fs.rm(zip,{force:true});
 await new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command','$ErrorActionPreference="Stop"; Compress-Archive -LiteralPath $env:MOCK_SOURCE -DestinationPath $env:MOCK_TARGET -Force'],{env:{...process.env,MOCK_SOURCE:folder,MOCK_TARGET:zip},stdio:'inherit'});child.on('error',reject);child.on('exit',c=>c?reject(Error('zip failed')):resolve());});console.log(folder);
 }finally{await fs.rm(stage,{recursive:true,force:true});}}
main().catch(e=>{console.error(e);process.exitCode=1;});
