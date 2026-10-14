'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/Code.gs'), 'utf8');
const fakeHtmlOutput = {
  sourceFile: null,
  title: null,
  setTitle(title) { this.title = title; return this; }
};
const context = vm.createContext({
  HtmlService: {
    createHtmlOutputFromFile(name) {
      fakeHtmlOutput.sourceFile = name;
      return fakeHtmlOutput;
    }
  }
});
vm.runInContext(source, context, {filename: 'Code.gs'});

function fizzBuzz(n) {
  return Array.from(context.calculateFizzBuzz(n));
}

test('doGet returns Index HTML output and sets title', () => {
  assert.equal(context.doGet(), fakeHtmlOutput);
  assert.equal(fakeHtmlOutput.sourceFile, 'Index');
  assert.match(fakeHtmlOutput.title, /FizzBuzz/);
});

test('N=1 yields one numeric output', () => {
  assert.deepEqual(fizzBuzz(1), ['1']);
});

test('Fizz and Buzz are produced for 3 and 5', () => {
  assert.deepEqual(fizzBuzz(5), ['1', '2', 'Fizz', '4', 'Buzz']);
});

test('N=15 emits FizzBuzz on the fifteenth value', () => {
  const got = fizzBuzz(15);
  assert.equal(got.length, 15);
  assert.equal(got[14], 'FizzBuzz');
});

test('N=16 has correct inclusive sequence', () => {
  assert.deepEqual(fizzBuzz(16), [
    '1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8',
    'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz', '16'
  ]);
});

test('N=30 uses correct 15/3/5 priority', () => {
  const got = fizzBuzz(30);
  assert.equal(got.length, 30);
  assert.equal(got[14], 'FizzBuzz');
  assert.equal(got[29], 'FizzBuzz');
  assert.equal(got[24], 'Buzz');
  assert.equal(got[26], 'Fizz');
});

test('N=1000 is permitted and includes last number', () => {
  const got = fizzBuzz(1000);
  assert.equal(got.length, 1000);
  assert.equal(got[999], 'Buzz');
});

test('invalid input is rejected on the server', () => {
  for (const value of [0, -1, 1001, 1.5, '15', null, undefined, NaN, Infinity, -Infinity]) {
    assert.throws(() => context.calculateFizzBuzz(value), /1から1000までの整数/);
  }
});

test('HTML includes client-server call and failure handling', () => {
  const html = fs.readFileSync(path.join(__dirname, '../src/Index.html'), 'utf8');
  assert.match(html, /google\.script\.run/);
  assert.match(html, /withSuccessHandler/);
  assert.match(html, /withFailureHandler/);
  assert.match(html, /calculateFizzBuzz\(n\)/);
  assert.match(html, /function validateLines\(/);
  assert.match(html, /id="fizzbuzzLog"/);
});
