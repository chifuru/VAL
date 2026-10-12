const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/Code.gs'), 'utf8');
const context = {
  HtmlService: {
    createHtmlOutput(html) {
      return {html, setTitle(title) { this.title = title; return this; },
        addMetaTag(name, value) { this[name] = value; return this; }};
    }
  }
};
vm.createContext(context);
vm.runInContext(source, context);
for (const event of [undefined, {parameter: {message: '<script>alert(1)</script>'}}]) {
  const result = context.doGet(event);
  const headings = [...result.html.matchAll(/<h1>(.*?)<\/h1>/gs)];
  assert.equal(headings.length, 1);
  assert.equal(headings[0][1], 'Hello, VALIS');
  assert.equal(result.title, 'Hello, VALIS');
  assert.ok(!/<script|<iframe|(?:src|href)=/i.test(result.html));
}
console.log('PASS: doGet returns one fixed Hello, VALIS heading, with no external resources.');
console.log('Scope: Node.js with HtmlService stub only; GAS deployment and browser rendering NOT tested.');
