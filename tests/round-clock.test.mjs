import test from 'node:test';
import assert from 'node:assert/strict';
import { RoundClock } from '../src/roundClock.js';

test('multiple pauses exclude hidden time and preserve deadline boundaries', () => {
  let time = 10;
  const clock = new RoundClock(() => time);
  time += 29999;
  assert.equal(clock.now() < 30000, true);
  clock.pause();
  time += 60000;
  clock.pause();
  assert.equal(clock.now(), 29999);
  clock.resume();
  clock.resume();
  time += 1;
  assert.equal(clock.now(), 30000);
  time += 1;
  assert.equal(clock.now(), 30001);
  clock.reset();
  assert.equal(clock.now(), 0);
});
