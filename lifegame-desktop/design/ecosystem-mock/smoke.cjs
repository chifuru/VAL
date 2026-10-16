'use strict';
const {spawnSync}=require('node:child_process'),path=require('node:path'),fs=require('node:fs');
const exe=path.join(__dirname,'dist/LifeLab-Mock-win32-x64/LifeLab-Mock.exe');
const result=spawnSync(exe,['--smoke-test'],{encoding:'utf8',timeout:120000});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
if(result.error||result.status!==0){console.error(result.error||'Native mock exit '+result.status);process.exit(1);}
const line=(result.stdout||'').split(/\r?\n/).find(l=>l.startsWith('{"ok":true'));
if(!line)throw Error('Native report absent');const report=JSON.parse(line);if(!report.ready||report.turn!==20||report.ate<1||report.births<1||report.nodeExposed)throw Error('Invalid native result');
fs.mkdirSync(path.join(__dirname,'evidence'),{recursive:true});fs.writeFileSync(path.join(__dirname,'evidence/native-report.json'),JSON.stringify(report,null,2)+'\n');
