const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/Code.gs'), 'utf8');
const context = {HtmlService: {createHtmlOutputFromFile(name) {
  assert.equal(name, 'Index');
  return {html: fs.readFileSync(path.join(__dirname, '../src', name+'.html'), 'utf8'),
    setTitle(title) {this.title=title;return this;},addMetaTag(name,value) {this[name]=value;return this;}};
}}};
vm.createContext(context);vm.runInContext(source,context);
const result=context.doGet();
assert.equal(result.title,'Hello, VALIS');
assert.match(result.html, /<h1 aria-label="Hello, VALIS">/);
assert.ok(!/<(?:script|link|img)[^>]+(?:src|href)=["']https?:/i.test(result.html));
const script=result.html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
console.log('PASS: GAS template mapping, title, accessible greeting, no external assets, JavaScript syntax.');
console.log('GAS HtmlService is stubbed; actual GAS execution is user-owned and untested here.');
