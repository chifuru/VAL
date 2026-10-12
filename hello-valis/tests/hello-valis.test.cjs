const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('GET returns the neon page as an HtmlOutput with a mobile viewport', () => {
  class HtmlOutput {
    constructor(content) { this.content = content; this.meta = {}; }
    getContent() { return this.content; }
    setTitle(title) { this.title = title; return this; }
    addMetaTag(name, value) { this.meta[name] = value; return this; }
  }

  const context = vm.createContext({
    HtmlService: {
      createHtmlOutputFromFile(name) {
        assert.equal(name, 'Index');
        return new HtmlOutput(readFileSync(join(__dirname, '../src/Index.html'), 'utf8'));
      },
    },
  });
  const source = readFileSync(join(__dirname, '../src/Code.gs'), 'utf8');
  vm.runInContext(source, context, { filename: 'src/Code.gs', timeout: 1000 });

  assert.equal(typeof context.doGet, 'function');
  const output = vm.runInContext('doGet({ parameter: {} })', context, { timeout: 1000 });
  assert.ok(output instanceof HtmlOutput, 'GAS must receive an HtmlOutput');
  assert.match(output.getContent(), /<h1>[\s\S]*Hello,[\s\S]*VALIS[\s\S]*<\/h1>/);
  assert.equal(output.title, 'VALIS — Neon Interface');
  assert.equal(output.meta.viewport, 'width=device-width, initial-scale=1');
});
