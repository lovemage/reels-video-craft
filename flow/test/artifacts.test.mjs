import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { matches, verifyOutputs } from '../cli/lib/artifacts.mjs';

let root;

before(() => {
  root = mkdtempSync(join(tmpdir(), 'video-flow-test-'));
  mkdirSync(join(root, 'public/captions'), { recursive: true });
  mkdirSync(join(root, 'src/modules'), { recursive: true });
  mkdirSync(join(root, 'out'), { recursive: true });
  writeFileSync(join(root, 'public/voiceover-raw.wav'), 'x');
  writeFileSync(join(root, 'public/voiceover-edited.wav'), 'x');
  writeFileSync(join(root, 'public/captions/captions.json'), '[]');
  writeFileSync(join(root, 'src/Composition.tsx'), 'x');
  writeFileSync(join(root, 'src/modules/HookCard.tsx'), 'x');
  writeFileSync(join(root, 'out/final-v1.mp4'), 'x');
  writeFileSync(join(root, 'out/final-v2.mp4'), 'x');
});

after(() => rmSync(root, { recursive: true, force: true }));

test('精確路徑', () => {
  assert.deepEqual(matches(root, 'src/Composition.tsx'), ['src/Composition.tsx']);
  assert.deepEqual(matches(root, 'src/Nope.tsx'), []);
});

test('* 只在單一路徑段內比對', () => {
  assert.deepEqual(matches(root, 'out/*.mp4').sort(), ['out/final-v1.mp4', 'out/final-v2.mp4']);
  assert.deepEqual(matches(root, 'public/voiceover-edited.*'), ['public/voiceover-edited.wav']);
  // 不該跨越 / 比對
  assert.deepEqual(matches(root, 'src/*.tsx'), ['src/Composition.tsx']);
});

test('** 跨路徑段比對', () => {
  const found = matches(root, 'src/**');
  assert.ok(found.includes('src/modules'), `got ${JSON.stringify(found)}`);
});

test('中間段的萬用字元', () => {
  assert.deepEqual(matches(root, 'public/*/captions.json'), ['public/captions/captions.json']);
});

test('verifyOutputs 回報缺哪一個 pattern', () => {
  const r = verifyOutputs(root, ['public/voiceover-raw.*', 'STORYBOARD.zh-TW.md']);
  assert.equal(r[0].ok, true);
  assert.deepEqual(r[0].found, ['public/voiceover-raw.wav']);
  assert.equal(r[1].ok, false);
});

test('brief.json#field 檢查欄位有沒有填，而不只是存在', () => {
  const empty = { timeline: { durationSec: null, totalFrames: null, lockedAt: null } };
  const filled = { timeline: { durationSec: 60, totalFrames: 1800, lockedAt: '2026-07-25' } };
  assert.equal(verifyOutputs(root, ['brief.json#timeline'], empty)[0].ok, false);
  assert.equal(verifyOutputs(root, ['brief.json#timeline'], filled)[0].ok, true);
  assert.equal(verifyOutputs(root, ['brief.json#timeline'], null)[0].ok, false);
});
