// Exercise actual passage assignments on first entry, restored state and restart.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../tripleBalance.twee'), 'utf8');
const passages = new Map(source.split(/^:: /m).slice(1).map(section => {
  const [heading, ...body] = section.split('\n');
  return [heading.split(/ \[| \{/)[0].trim(), body.join('\n')];
}));
function run(name, state) {
  const vars = passages.get(name).split(/^--\s*$/m);
  assert.equal(vars.length, 2);
  const context = vm.createContext(state);
  for (const line of vars[0].split('\n')) {
    if (!line.trim() || line.startsWith('ui.')) continue;
    const match = line.match(/^([\w.]+)(?:\s+\((.*)\))?:\s*(.*)$/);
    assert.ok(match, `${name}: ${line}`);
    if (!match[2] || vm.runInContext(match[2], context)) {
      vm.runInContext(`${match[1]} = (${match[3]})`, context);
    }
  }
}
let tested = 0;
for (const [name, body] of passages) {
  if (!/^applied\.\w+: true$/m.test(body)) continue;
  let draws = 0;
  const state = { applied: {}, circle: 10, happy: 10, money: 10, tech: 3,
    randomEvent: 0, Math: { max: Math.max, floor: Math.floor, random: () => { draws++; return 0.5; } } };
  run(name, state);
  const saved = JSON.stringify(state);
  const firstDraws = draws;
  // JSON round trip reproduces persisted gameplay variables on page reload.
  const restored = { ...JSON.parse(saved), Math: state.Math };
  run(name, restored);
  assert.equal(JSON.stringify(restored), saved, `${name}: reload changed state`);
  assert.equal(draws, firstDraws, `${name}: reload drew another event`);
  const flag = Object.keys(restored.applied)[0];
  assert.equal(restored.applied[flag], true);
  run('Start', restored);
  assert.equal(Object.keys(restored.applied).length, 0);
  run(name, restored);
  assert.equal(restored.applied[flag], true, `${name}: restart blocked effects`);
  tested++;
}
assert.equal(tested, 48);
console.log(`Verified ${tested} effect passages: reload stability and flags reset on restart.`);
