'use strict';
// Run the actual browser Worker source in a separate Node thread for determinism tests.
const {parentPort}=require('node:worker_threads'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'../src/ecology');
const sandbox={structuredClone,performance,console,TextEncoder,onmessage:null,postMessage:data=>parentPort.postMessage(data)};
const context=vm.createContext(sandbox);
sandbox.importScripts=(...names)=>{for(const name of names)vm.runInContext(fs.readFileSync(path.join(base,name),'utf8'),context,{filename:name});};
vm.runInContext(fs.readFileSync(path.join(base,'compute-worker.js'),'utf8'),context,{filename:'compute-worker.js'});
parentPort.on('message',data=>sandbox.onmessage({data}));
