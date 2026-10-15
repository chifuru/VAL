// Archive lifetime is one application process. No history file is opened or written.
'use strict';
const {validateRecord}=require('./record-schema.cjs');
class SessionStore {
 constructor(){this.records=new Map();}
 async list(){return {records:structuredClone([...this.records.values()].reverse()),warning:null};}
 async save(input){const record=validateRecord(input);if(record.status!=='complete')throw Error('図鑑に記録できるのは完走した最終結果だけです。');const old=this.records.get(record.runId);if(old&&JSON.stringify(old)!==JSON.stringify(record))throw Error('最終結果は同じrunで変更できません。');this.records.set(record.runId,record);return {runId:record.runId};}
 async flush(){}
 clear(){this.records.clear();}
}
module.exports={SessionStore,validateRecord};
