'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../src/Index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(script, 'Index.html must contain an inline script');
const source = script[1];

function makeHarness(options = {}) {
  const nodes = new Map();
  function element(id) {
    const el = {
      id, value: '', textContent: '', disabled: false, style: {},
      scrollTop: 0, scrollHeight: 100, attrs: {}, handlers: {},
      addEventListener(type, handler) { this.handlers[type] = handler; },
      setAttribute(key, value) { this.attrs[key] = value; },
      getContext() {
        return {
          fillRect() {}, clearRect() {},
          set fillStyle(_value) {}, set imageSmoothingEnabled(_value) {}
        };
      }
    };
    nodes.set(id, el);
    return el;
  }
  [
    'fizzbuzz-form', 'limit', 'run-button', 'pause-button', 'skip-button',
    'speed', 'result', 'error', 'status', 'current-line', 'stage-name',
    'food-total', 'next-stage', 'growth-bar', 'growth-progress',
    'fizz-count', 'buzz-count', 'special-count', 'creature'
  ].forEach(element);
  nodes.get('limit').value = '15';
  nodes.get('speed').value = '480';

  let timerId = 0;
  const timers = new Map();
  const setTimeoutMock = (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; };
  const clearTimeoutMock = id => { timers.delete(id); };
  let now = 50;
  let calls = 0;
  const runner = {
    success: null, failure: null,
    withSuccessHandler(fn) { this.success = fn; return this; },
    withFailureHandler(fn) { this.failure = fn; return this; },
    calculateFizzBuzz(limit) {
      calls++;
      if (options.fail) this.failure(new Error('計算エラー'));
      else if (options.malformed) this.success(['Fizz']);
      else this.success(Array.from({length: limit}, (_, i) => {
        const n = i + 1;
        return n % 15 === 0 ? 'FizzBuzz' : n % 3 === 0 ? 'Fizz' : n % 5 === 0 ? 'Buzz' : String(n);
      }));
    }
  };
  const window = {
    requestAnimationFrame() {},
    matchMedia() { return {matches: Boolean(options.reducedMotion)}; }
  };
  vm.runInNewContext(source, {
    window, document: {getElementById(id) {return nodes.get(id);}},
    google: {script: {run: runner}},
    performance: {now() {return ++now;}},
    setTimeout: setTimeoutMock,
    clearTimeout: clearTimeoutMock
  }, {filename:'Index.inline.js'});
  return {
    nodes, logic: window.FizzBuzzCreatureLogic,
    calls: () => calls, pending: () => timers.size,
    fire(type, id) { nodes.get(id).handlers[type]({preventDefault() {}}); },
    next() {
      const first = timers.entries().next();
      if (first.done) return false;
      timers.delete(first.value[0]);
      first.value[1].fn();
      return true;
    }
  };
}
const get = (h, id) => h.nodes.get(id);

test('three foods are exclusive and evolution thresholds are deterministic', () => {
  const logic = makeHarness().logic;
  assert.equal(logic.classify('Fizz'), 'fizz');
  assert.equal(logic.classify('Buzz'), 'buzz');
  assert.equal(logic.classify('FizzBuzz'), 'fizzbuzz');
  assert.equal(logic.classify('15'), null);
  for (const [count, expected] of [[0,0],[2,0],[3,1],[6,1],[7,2],[14,2],[15,3],[100,3]]) {
    assert.equal(logic.stageFor(count), expected, 'foods='+count);
  }
  const stats = logic.tally(['1','2','Fizz','4','Buzz','Fizz','7','8','Fizz','Buzz','11','Fizz','13','14','FizzBuzz']);
  assert.equal(stats.fizz, 4);
  assert.equal(stats.buzz, 2);
  assert.equal(stats.fizzbuzz, 1);
  assert.equal(stats.total, 7);
  assert.equal(stats.stage, 2);
});

test('auto replay appends unmodified output one line at a time', () => {
  const h = makeHarness();
  h.fire('submit','fizzbuzz-form');
  assert.equal(h.calls(), 1);
  assert.equal(get(h,'result').value, '1');
  assert.equal(get(h,'run-button').disabled, true);
  for (let i=0;i<4;i++) assert.equal(h.next(), true);
  assert.equal(get(h,'result').value, '1\n2\nFizz\n4\nBuzz');
  assert.equal(get(h,'fizz-count').textContent, '1');
  assert.equal(get(h,'buzz-count').textContent, '1');
  assert.equal(get(h,'special-count').textContent, '0');
  for (let i=5;i<15;i++) h.next();
  assert.equal(get(h,'result').value, '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz');
  assert.equal(get(h,'stage-name').textContent, 'LV.2 おとな');
  assert.equal(get(h,'special-count').textContent, '1');
  assert.equal(get(h,'run-button').disabled, false);
  assert.equal(h.pending(), 0);
});

test('pause blocks output and resume continues; skip preserves final form and stage', () => {
  const h = makeHarness();
  h.fire('submit','fizzbuzz-form');
  h.next();
  h.fire('click','pause-button');
  assert.equal(h.pending(),0);
  assert.equal(get(h,'result').value,'1\n2');
  h.fire('click','pause-button');
  assert.equal(h.next(),true);
  assert.equal(get(h,'result').value,'1\n2\nFizz');
  h.fire('click','skip-button');
  assert.equal(get(h,'result').value.split('\n').length,15);
  assert.equal(get(h,'result').value.split('\n')[14],'FizzBuzz');
  assert.equal(get(h,'food-total').textContent,'たべたえさ 7');
  assert.equal(get(h,'stage-name').textContent,'LV.2 おとな');
  assert.equal(get(h,'run-button').disabled,false);
  assert.equal(h.pending(),0);
});

test('invalid input, malformed response, and GAS errors do not produce fake output', () => {
  const h = makeHarness();
  get(h,'limit').value = '0';
  h.fire('submit','fizzbuzz-form');
  assert.equal(h.calls(),0);
  assert.match(get(h,'error').textContent,/整数/);
  assert.equal(get(h,'result').value,'');
  const malformed = makeHarness({malformed:true});
  malformed.fire('submit','fizzbuzz-form');
  assert.equal(get(malformed,'result').value,'');
  assert.match(get(malformed,'error').textContent,/応答形式/);
  const failed = makeHarness({fail:true});
  failed.fire('submit','fizzbuzz-form');
  assert.equal(get(failed,'result').value,'');
  assert.match(get(failed,'error').textContent,/計算エラー/);
});

test('reduced-motion preference shows plain final output without animation', () => {
  const h = makeHarness({reducedMotion:true});
  h.fire('submit','fizzbuzz-form');
  assert.equal(h.pending(),0);
  assert.equal(get(h,'result').value.split('\n').length,15);
  assert.equal(get(h,'stage-name').textContent,'LV.2 おとな');
});

test('another calculation resets food counters and old output', () => {
  const h = makeHarness();
  h.fire('submit','fizzbuzz-form');
  h.fire('click','skip-button');
  get(h,'limit').value='2';
  h.fire('submit','fizzbuzz-form');
  h.next();
  assert.equal(get(h,'result').value,'1\n2');
  assert.equal(get(h,'food-total').textContent,'たべたえさ 0');
  assert.equal(get(h,'stage-name').textContent,'LV.0 ちび');
});
