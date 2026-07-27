import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistry } from '../registry/validate.mjs';
import {
  methods,
  stages,
  filterMethods,
  planFor,
  getMethod,
  briefDimensions,
} from '../cli/lib/registry.mjs';

test('registry 通過 schema 驗證', () => {
  const errors = validateRegistry();
  assert.deepEqual(errors, [], `registry 有問題：\n${errors.join('\n')}`);
});

test('每套方式都對每個階段表態', () => {
  const ids = stages().stages.map((s) => s.id);
  for (const m of methods().methods) {
    assert.deepEqual(
      Object.keys(m.stages).sort(),
      [...ids].sort(),
      `${m.code} 的 stages 與階段清單不符`,
    );
  }
});

test('filterMethods 依輸入排除，並附上原因', () => {
  const { eligible, excluded } = filterMethods({ input: 'talking-head-video' });
  assert.ok(!eligible.some((m) => m.code === 'M3'), 'M3 不吃口播影片，應被排除');
  const m3 = excluded.find((e) => e.method.code === 'M3');
  assert.ok(m3.reasons.length > 0, '排除必須說明原因');
});

test('filterMethods 依比例排除手繪方式', () => {
  const { eligible } = filterMethods({ aspect: '16:9' });
  const codes = eligible.map((m) => m.code);
  assert.ok(!codes.includes('M4'), 'M4 只支援直式');
  assert.ok(!codes.includes('M5'), 'M5 只支援直式');
  assert.ok(codes.includes('M8'), 'M8 支援橫式');
});

test('custom 比例只有程式繪製的方式支援', () => {
  const { eligible } = filterMethods({ aspect: 'custom' });
  for (const m of eligible) {
    assert.equal(m.visualTrack, 'code', `${m.code} 不該支援 custom`);
  }
  assert.ok(eligible.some((m) => m.code === 'M8'));
});

test('M8 的對時階段輸出 programBeats.ts，不是 segments.ts', () => {
  const { plan } = planFor('M8');
  const align = plan.find((p) => p.stage.id === 'script-align');
  assert.deepEqual(align.stage.outputs, ['src/data/programBeats.ts']);
  assert.match(align.stage.name['zh-TW'], /關鍵詞/);
  assert.ok(
    align.stage.rules['zh-TW'].every((r) => !r.includes('fuzzy')),
    'M8 不該套用 fuzzy match 規則',
  );
});

test('M4 的對時階段仍是 fuzzy match → segments.ts', () => {
  const { plan } = planFor('M4');
  const align = plan.find((p) => p.stage.id === 'script-align');
  assert.deepEqual(align.stage.outputs, ['src/data/segments.ts']);
  assert.match(align.note, /fuzzy match/);
});

test('override 不影響未覆寫的方式', () => {
  const { plan } = planFor('M2');
  const align = plan.find((p) => p.stage.id === 'script-align');
  assert.equal(align.stage.name['zh-TW'], '旁白時間對齊');
});

test('existing-clip 輸入會關掉語音階段', () => {
  const { plan } = planFor('M3', { input: 'existing-clip' });
  for (const id of ['speech-edit', 'transcribe', 'caption-correct']) {
    assert.equal(plan.find((p) => p.stage.id === id).status, 'skip');
  }
});

test('只有文字稿時，語音階段標出前提', () => {
  const { plan } = planFor('M1', { input: 'script-text' });
  const speech = plan.find((p) => p.stage.id === 'speech-edit');
  assert.match(speech.precondition, /產生旁白/);
});

test('planFor 對未知方式丟錯', () => {
  assert.throws(() => planFor('M99'), /未知的製作方式/);
});

test('getMethod 接受 id 與 code', () => {
  assert.equal(getMethod('M8').id, 'program-graphics');
  assert.equal(getMethod('program-graphics').code, 'M8');
  assert.equal(getMethod('m8').code, 'M8');
  assert.equal(getMethod('nope'), null);
});

test('briefDimensions 處理固定比例與自訂尺寸', () => {
  assert.deepEqual(briefDimensions({ aspectSize: '1080x1920' }), { width: 1080, height: 1920 });
  assert.deepEqual(briefDimensions({ aspect: 'custom', width: 2560, height: 1440 }), {
    width: 2560,
    height: 1440,
  });
  assert.equal(briefDimensions({ aspectSize: 'follow-source' }), null);
  assert.equal(briefDimensions(null), null);
});

test('有 guide 的方式，檔案真的存在', () => {
  const withGuide = methods().methods.filter((m) => m.guide);
  assert.ok(withGuide.length >= 4, '至少四套方式應有長篇 guide');
  // validateRegistry 已檢查存在性；這裡確保沒人把 guide 全刪光
});
