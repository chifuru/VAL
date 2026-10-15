'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const PNG_PREFIX = 'data:image/png;base64,';
const MAX_PORTRAIT_BYTES = 2 * 1024 * 1024;
const MAX_RECORD_BYTES = 10 * 1024 * 1024;
const MAX_HISTORY_BYTES = 256 * 1024 * 1024;
const STATUSES = new Set(['growing', 'paused', 'stopped', 'complete']);
const FIELDS = ['schemaVersion','runId','createdAt','updatedAt','status','seed','processed','engineVersion','assetVersion','state','snapshots','portrait'];
class HistoryError extends Error {
  constructor(code, message) { super(message); this.name = 'HistoryError'; this.code = code; }
}
function invalid(message) { throw new HistoryError('INVALID_RECORD', '個体記録の形式が不正です: ' + message); }
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function integer(value, min, max) { return Number.isSafeInteger(value) && value >= min && value <= max; }
function jsonData(value, depth = 0, budget = {nodes:0}) {
  if (++budget.nodes > 100000 || depth > 40) invalid('データが大きすぎます');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return;
  if (typeof value === 'number') { if (!Number.isFinite(value)) invalid('有限数が必要です'); return; }
  if (typeof value !== 'object') invalid('JSONデータが必要です');
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid('単純なデータが必要です');
  for (const [key, child] of Object.entries(value)) {
    if (['__proto__','constructor','prototype'].includes(key)) invalid('予約された項目があります');
    jsonData(child, depth + 1, budget);
  }
}
function portrait(value) {
  if (typeof value !== 'string' || !value.startsWith(PNG_PREFIX) || Buffer.byteLength(value) > MAX_PORTRAIT_BYTES) invalid('肖像は2MB以内のPNGが必要です');
  const encoded = value.slice(PNG_PREFIX.length);
  if (!encoded || encoded.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) invalid('PNGの符号化が不正です');
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length < 45 || bytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a' || bytes.subarray(12,16).toString('ascii') !== 'IHDR') invalid('PNGが必要です');
  const w = bytes.readUInt32BE(16), h = bytes.readUInt32BE(20);
  if (!integer(w, 1, 4096) || !integer(h, 1, 4096)) invalid('肖像の寸法が不正です');
}
function stateData(value, seed, processed) {
  if (!object(value) || value.seed !== seed || value.current !== processed) invalid('Nと再生位置が一致しません');
  if (!Number.isFinite(value.points) || value.points < 0 || value.points > 100 || !integer(value.stage, 0, value.engineVersion>=3?3:2)) invalid('成長値が不正です');
  if (value.dna && value.dna.seed !== undefined && value.dna.seed !== seed) invalid('DNAのNが一致しません');
  if(value.engineVersion===5){
    if(value.appearanceRevision!==3||!object(value.awakening))invalid('生態版が不正です');
    if(value.finalAppearance&&(value.finalAppearance.version!==5||value.finalAppearance.appearanceRevision!==3))invalid('覚醒版が不正です');
  }
  if(value.engineVersion===4){
    if(value.appearanceRevision!==undefined&&![1,2].includes(value.appearanceRevision))invalid('外見版が不正です');
    if(value.finalAppearance?.appearanceRevision!==undefined&&![1,2].includes(value.finalAppearance.appearanceRevision))invalid('成熟外見版が不正です');
    if(value.finalAppearance&&(value.finalAppearance.appearanceRevision||1)!==(value.appearanceRevision||1))invalid('成熟外見版が一致しません');
  }
}
function validateRecord(input) {
  if (!object(input) || FIELDS.some(k => !Object.hasOwn(input, k)) || Object.keys(input).some(k => !FIELDS.includes(k))) invalid('必須項目が一致しません');
  if (input.schemaVersion !== 1 || ![1,2,3,4,5].includes(input.engineVersion)) invalid('対応していない記録版です');
  if (typeof input.runId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(input.runId)) invalid('実行IDが不正です');
  if (!integer(input.seed,1,1000) || !integer(input.processed,0,input.seed)) invalid('Nまたは再生位置が不正です');
  if (!STATUSES.has(input.status) || input.status === 'complete' && input.processed !== input.seed) invalid('再生状態が不正です');
  if (typeof input.assetVersion !== 'string' || !input.assetVersion.trim() || input.assetVersion.length > 128) invalid('素材版が不正です');
  for (const name of ['createdAt','updatedAt']) {
    if (typeof input[name] !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(input[name]) || !Number.isFinite(Date.parse(input[name]))) invalid('記録日時が不正です');
  }
  if (Date.parse(input.updatedAt) < Date.parse(input.createdAt)) invalid('更新日時が出生より前です');
  jsonData(input);
  if (!object(input.state)) invalid('状態が不正です');
  if((input.state.engineVersion||1)!==input.engineVersion)invalid('成長版が一致しません');
  stateData(input.state,input.seed,input.processed);
  portrait(input.portrait);
  if (!Array.isArray(input.snapshots) || input.snapshots.length > (input.engineVersion>=3?4:3)) invalid('相の記録が不正です');
  const stages = new Set();
  for (const item of input.snapshots) {
    if (!object(item) || Object.keys(item).sort().join(',') !== 'portrait,processed,stage,state' || !integer(item.stage,0,input.engineVersion>=3?3:2) || !integer(item.processed,0,input.processed) || stages.has(item.stage)) invalid('相の記録が不正です');
    stages.add(item.stage);
    if ((item.state?.engineVersion||1)!==input.engineVersion) invalid('相の成長版が一致しません');
    if(input.engineVersion===4&&(item.state.appearanceRevision||1)!==(input.state.appearanceRevision||1))invalid('相の外見版が一致しません');
    stateData(item.state,input.seed,item.processed);
    if (item.state.stage !== item.stage) invalid('相の記録が一致しません');
    portrait(item.portrait);
  }
  const encoded = JSON.stringify(input);
  if (Buffer.byteLength(encoded) > MAX_RECORD_BYTES) invalid('個体記録が大きすぎます');
  return JSON.parse(encoded);
}
function parseHistory(text) {
  const saved = JSON.parse(text);
  if (!object(saved) || saved.schemaVersion !== 1 || !Array.isArray(saved.records)) throw new Error('Unsupported history envelope');
  const records = saved.records.map(validateRecord);
  if (new Set(records.map(r => r.runId)).size !== records.length) throw new Error('Duplicate run ID');
  return records;
}
class HistoryStore {
  constructor(directory, options = {}) {
    this.directory = path.resolve(directory);
    this.file = path.join(this.directory,'history.json');
    this.backup = path.join(this.directory,'history.backup.json');
    this.fs = options.fs || fs;
    this.records = []; this.warning = null; this.blocked = false;
    this.raw = null; this.loading = null; this.queue = Promise.resolve(); this.lastError = null;
  }
  async load() {
    if (!this.loading) this.loading = this.loadOnce();
    return this.loading;
  }
  async loadOnce() {
    try {
      await this.fs.mkdir(this.directory,{recursive:true});
      let text;
      try { text = await this.fs.readFile(this.file,'utf8'); }
      catch (err) {
        if (err.code !== 'ENOENT') throw err;
        try { await this.fs.access(this.backup); }
        catch (backupErr) { if (backupErr.code === 'ENOENT') return; throw backupErr; }
        throw new Error('Primary history missing while backup exists');
      }
      if (Buffer.byteLength(text) > MAX_HISTORY_BYTES) throw new Error('History too large');
      this.records = parseHistory(text); this.raw = text;
    } catch (err) {
      this.records = []; this.blocked = true;
      this.warning = '保存された個体記録を読み取れません。元の記録とバックアップを保持し、保存を停止しています。';
    }
  }
  async list() {
    await this.load();
    return {records:JSON.parse(JSON.stringify(this.records.slice().sort((a,b) => Date.parse(b.updatedAt)-Date.parse(a.updatedAt) || b.runId.localeCompare(a.runId)))),warning:this.warning};
  }
  save(input) {
    const task = this.queue.then(async () => {
      const record = validateRecord(input);
      await this.load();
      if (this.blocked) throw new HistoryError('HISTORY_CORRUPT',this.warning);
      const current = this.records.find(r => r.runId === record.runId);
      if (current && (current.seed !== record.seed || current.createdAt !== record.createdAt || current.engineVersion !== record.engineVersion || (current.state.appearanceRevision||1)!==(record.state.appearanceRevision||1))) invalid('出生記録は変更できません');
      if (current && (Date.parse(record.updatedAt) < Date.parse(current.updatedAt) || record.processed < current.processed)) invalid('古い更新で上書きできません');
      let disk = null;
      try { disk = await this.fs.readFile(this.file,'utf8'); }
      catch (err) { if (err.code !== 'ENOENT') throw err; }
      if (disk !== this.raw) {
        this.blocked = true;
        this.warning = '個体記録が外部で変更されています。元の記録を保持し、保存を停止しています。';
        throw new HistoryError('HISTORY_CHANGED',this.warning);
      }
      const next = this.records.filter(r => r.runId !== record.runId).concat(record);
      const text = JSON.stringify({schemaVersion:1,records:next},null,2) + '\n';
      if (Buffer.byteLength(text) > MAX_HISTORY_BYTES) throw new HistoryError('HISTORY_FULL','個体記録の保存容量に達しました。元の記録は保持しています。');
      if (this.raw !== null) await this.atomic(this.backup,this.raw);
      await this.atomic(this.file,text);
      this.records = next; this.raw = text; this.warning = null;
      return JSON.parse(JSON.stringify(record));
    });
    this.queue = task.then(() => { this.lastError = null; },err => {
      this.lastError = err instanceof HistoryError ? err : new HistoryError('SAVE_FAILED','個体記録を保存できません。保存先の空き容量やアクセス権を確認してください。');
      if (!this.blocked) this.warning = this.lastError.message;
    });
    return task.catch(err => { throw err instanceof HistoryError ? err : new HistoryError('SAVE_FAILED','個体記録を保存できません。保存先の空き容量やアクセス権を確認してください。'); });
  }
  async atomic(target,text) {
    const temp = target + '.' + process.pid + '.' + require('node:crypto').randomUUID() + '.tmp';
    let handle;
    try {
      handle = await this.fs.open(temp,'wx',0o600);
      await handle.writeFile(text,'utf8'); await handle.sync(); await handle.close(); handle = null;
      await this.fs.rename(temp,target);
    } finally {
      if (handle) await handle.close().catch(() => {});
      await this.fs.unlink(temp).catch(() => {});
    }
  }
  async flush() { await this.queue; if (this.lastError) throw this.lastError; }
}
module.exports = {HistoryStore,HistoryError,validateRecord,parseHistory,MAX_PORTRAIT_BYTES};
