import test from 'node:test';
import assert from 'node:assert/strict';
import { RainAmbience } from '../src/rain-ambience.js';

test('雨声只在雨夜播放，自动播放受阻后可由玩家操作重试', async () => {
  let attempts = 0, pauses = 0;
  const audio = { paused: true, currentTime: 2,
    play() { attempts++; if (attempts === 1) return Promise.reject(new Error('blocked')); this.paused = false; return Promise.resolve(); },
    pause() { pauses++; this.paused = true; } };
  const rain = new RainAmbience(audio);
  rain.setActive(true); await Promise.resolve();
  assert.equal(attempts, 1); assert.equal(audio.loop, true);
  rain.retry(); assert.equal(attempts, 2);
  rain.setActive(false); rain.retry();
  assert.equal(pauses, 1); assert.equal(audio.currentTime, 0); assert.equal(attempts, 2);
});
