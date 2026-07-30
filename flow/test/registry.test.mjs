import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistry } from '../registry/validate.mjs';
import {
  methods,
  stages,
  questions,
  filterMethods,
  planFor,
  getMethod,
  briefDimensions,
  stageOutputsFor,
} from '../cli/lib/registry.mjs';
import { parseScript } from '../cli/commands/tts.mjs';

test('registry 通過 schema 驗證', () => {
  const errors = validateRegistry();
  assert.deepEqual(errors, [], `registry 有問題：\n${errors.join('\n')}`);
});

test('Avatar intake 題固定提供四種互斥方式', () => {
  const avatar = questions().questions.find((q) => q.id === 'avatarMode');
  assert.ok(avatar, '缺少 avatarMode 題');
  assert.deepEqual(
    avatar.options.map((o) => o.id),
    ['live-video', 'anime-presenter', 'ai-lipsync', 'none'],
  );
  const ai = avatar.options.find((o) => o.id === 'ai-lipsync');
  assert.deepEqual(
    ai.followUp.map((f) => f.id),
    ['avatarSource', 'avatarProvider', 'avatarEndpointEnv', 'avatarApiKeyEnv'],
    'AI lip-sync 必須記來源素材、provider 與 .env 變數名稱',
  );
});

test('使用者提供 BGM 時必須記錄來源與授權', () => {
  const bgm = questions().questions.find((q) => q.id === 'bgm');
  const supplied = bgm.options.find((o) => o.id === 'supplied');
  assert.deepEqual(
    supplied.followUp.map((f) => f.id),
    ['bgmSource', 'bgmLicense'],
  );
});

test('字幕語言層級提供中英雙語、純中文與自訂組合', () => {
  const languages = questions().questions.find((q) => q.id === 'captionLanguages');
  assert.ok(languages, '缺少 captionLanguages 題');
  assert.deepEqual(
    languages.options.map((o) => o.id),
    ['zh-en', 'zh-only', 'custom'],
  );
  assert.equal(
    languages.options.find((o) => o.id === 'custom').followUp[0].id,
    'captionLanguageSpec',
  );
});

test('中英雙語字幕校對關卡會要求英文 Caption JSON', () => {
  const stage = stages().stages.find((s) => s.id === 'caption-correct');
  assert.deepEqual(stageOutputsFor(stage, { captionLanguages: 'zh-en' }), [
    'public/captions/captions.json',
    'public/captions/captions.en.json',
  ]);
  assert.deepEqual(stageOutputsFor(stage, { captionLanguages: 'zh-only' }), [
    'public/captions/captions.json',
  ]);
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

test('M4 固定最多兩張 3×3 母圖並以 panel 座標運鏡', () => {
  const { plan } = planFor('M4');
  const storyboard = plan.find((p) => p.stage.id === 'storyboard');
  const assets = plan.find((p) => p.stage.id === 'asset-gen');
  const align = plan.find((p) => p.stage.id === 'script-align');
  const assemble = plan.find((p) => p.stage.id === 'assemble');

  assert.match(storyboard.note, /--grid 3x3/);
  assert.match(storyboard.note, /最多兩張共 18 格/);
  assert.match(assets.note, /最多兩個 grid job/);
  assert.match(align.note, /panelIndex/);
  assert.match(assemble.note, /最多兩張 3×3 母圖/);
  assert.ok(assemble.stage.rules['zh-TW'].some((rule) => /固定最多兩張母圖/.test(rule)));
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

test('配音選 TTS 時，tts-gen 必跑、speech-edit 跳過', () => {
  const { plan } = planFor('M1', { input: 'script-text', voice: 'tts' });
  assert.equal(plan.find((p) => p.stage.id === 'tts-gen').status, 'required');
  assert.equal(plan.find((p) => p.stage.id === 'source-prep').status, 'skip');
  assert.equal(plan.find((p) => p.stage.id === 'speech-edit').status, 'skip');
  const transcribe = plan.find((p) => p.stage.id === 'transcribe');
  assert.equal(transcribe.status, 'required');
  assert.match(transcribe.precondition, /TTS 配音生成/);
});

test('配音選真人錄音時，tts-gen 跳過、speech-edit 照跑', () => {
  const { plan } = planFor('M1', { input: 'talking-head-video', voice: 'human' });
  assert.equal(plan.find((p) => p.stage.id === 'tts-gen').status, 'skip');
  assert.equal(plan.find((p) => p.stage.id === 'speech-edit').status, 'required');
});

test('配音未確認時，tts-gen 維持 optional 並註明由配音答案決定', () => {
  const { plan } = planFor('M1');
  const tts = plan.find((p) => p.stage.id === 'tts-gen');
  assert.equal(tts.status, 'optional');
  assert.match(tts.note, /配音答案/);
});

test('M3 不吃語音，voice=tts 也不會長出 tts-gen', () => {
  const { plan } = planFor('M3', { input: 'existing-clip', voice: 'tts' });
  assert.equal(plan.find((p) => p.stage.id === 'tts-gen').status, 'skip');
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

test('parseScript 去掉 markdown 標記，段落切成 TTS 段', () => {
  const md = [
    '# 標題不唸',
    '',
    '<!-- 註解不唸 -->',
    '第一段**重點**照唸，',
    '跨行要接起來。',
    '',
    '- 列表符號拿掉',
    '',
    '```',
    'code 不唸',
    '```',
    '',
    '第三段。',
  ].join('\n');
  assert.deepEqual(parseScript(md), ['第一段重點照唸，跨行要接起來。', '列表符號拿掉', '第三段。']);
});

test('有 guide 的方式，檔案真的存在', () => {
  const withGuide = methods().methods.filter((m) => m.guide);
  assert.ok(withGuide.length >= 4, '至少四套方式應有長篇 guide');
  // validateRegistry 已檢查存在性；這裡確保沒人把 guide 全刪光
});
