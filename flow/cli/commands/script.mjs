import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { contentRoot } from '../lib/registry.mjs';
import { parseScript } from './tts.mjs';
import { heading, bold, grey, green, yellow, red } from '../lib/ui.mjs';

/**
 * 內容上游：一個題目一個 content/<topic>/，長篇母稿拆成多集 reels 稿。
 *   video-flow script <topic> --init      # 建立題目骨架（TOPIC.md、master、episodes/）
 *   video-flow script <topic>             # 檢查各集字數與預估口播秒數（reels 以 60 秒為上限）
 * 稿子本身由人／agent 撰寫；這裡只管結構與長度，不管文筆。
 */
export function run(args) {
  const topic = args._[0];
  if (!topic || !/^[a-z0-9][a-z0-9-]*$/.test(topic)) {
    console.error('用法：video-flow script <topic-slug> [--init]（slug 限英數與 -）');
    process.exit(1);
  }
  const dir = join(contentRoot(), topic);

  if (args.init) return init(topic, dir);

  if (!existsSync(dir)) {
    console.error(red(`找不到 ${dir}。先跑：video-flow script ${topic} --init`));
    process.exit(1);
  }
  check(topic, dir, args);
}

function init(topic, dir) {
  if (existsSync(join(dir, 'TOPIC.md'))) {
    console.error(red(`${dir} 已初始化過。`));
    process.exit(1);
  }
  mkdirSync(join(dir, 'episodes'), { recursive: true });
  writeFileSync(join(dir, 'TOPIC.md'), TOPIC_TEMPLATE(topic));
  writeFileSync(join(dir, 'master.zh-TW.md'), MASTER_TEMPLATE(topic));
  writeFileSync(join(dir, 'episodes', 'ep01.zh-TW.md'), EPISODE_TEMPLATE(topic, '01'));
  console.log(`${green('已建立')} ${dir}`);
  console.log(grey('  TOPIC.md            — 選題依據：為什麼現在做這題、參考連結、目標受眾'));
  console.log(grey('  master.zh-TW.md     — 長篇母稿：先寫完整論述，再拆集'));
  console.log(grey('  episodes/ep01.zh-TW.md — 每集一檔；拆集時複製這個模板'));
  console.log(grey(`\n寫完後跑：video-flow script ${topic} 檢查各集長度`));
}

function check(topic, dir, args) {
  const epDir = join(dir, 'episodes');
  const files = existsSync(epDir)
    ? readdirSync(epDir).filter((f) => /^ep\d+\..*\.md$/.test(f)).sort()
    : [];
  const rate = Number(args.rate) || 4.5; // 中文口播約 4–5 字／秒
  const max = Number(args.max) || 60;

  heading(`${topic} · 分集稿檢查`);
  if (!existsSync(join(dir, 'master.zh-TW.md'))) {
    console.log(yellow('沒有 master.zh-TW.md — 建議先寫長篇母稿再拆集，論述才不會斷。'));
  }
  if (!files.length) {
    console.log(yellow(`episodes/ 還沒有分集稿（命名：ep01.zh-TW.md、ep02.zh-TW.md…）。`));
    process.exit(1);
  }

  const rows = [];
  let problems = 0;
  for (const f of files) {
    const segments = parseScript(readFileSync(join(epDir, f), 'utf8'));
    const chars = segments.reduce((n, s) => n + speechUnits(s), 0);
    const sec = chars / rate;
    const issues = [];
    if (!segments.length) issues.push('空稿');
    if (sec > max) issues.push(`預估 ${sec.toFixed(0)}s 超過 ${max}s`);
    if (segments[0] && speechUnits(segments[0]) / rate > 6) issues.push('第一段（hook）超過 6 秒');
    if (issues.length) problems++;
    rows.push({ f, segments: segments.length, chars, sec, issues });
  }

  console.log(grey(`估算基準：${rate} 字／秒（--rate 可調），上限 ${max} 秒（--max 可調）\n`));
  for (const r of rows) {
    const mark = r.issues.length ? red('✗') : green('✔');
    console.log(`  ${mark} ${bold(r.f.padEnd(18))} ${String(r.segments).padStart(2)} 段  ${String(r.chars).padStart(4)} 字  約 ${r.sec.toFixed(0).padStart(3)} 秒`);
    r.issues.forEach((i) => console.log(yellow(`      · ${i}`)));
  }
  console.log('');
  if (problems) {
    console.log(red(`${problems} 集需要修稿。`));
    process.exit(1);
  }
  console.log(green(`全部 ${rows.length} 集長度合格。`));
  console.log(grey(`接著把整套系列送進 pipeline：video-flow series ${topic} --method ... （共用設定一次確認）`));
}

/**
 * 口播長度估算單位：CJK 一字一單位；拉丁字詞一詞約兩單位（音節數的粗估）。
 * 這是排程用的粗估，不是承諾——真實長度以 TTS／錄音產出為準。
 */
export function speechUnits(text) {
  const cjk = (text.match(/[㐀-鿿豈-﫿]/g) ?? []).length;
  const words = (text.match(/[A-Za-z0-9]+/g) ?? []).length;
  return cjk + words * 2;
}

const TOPIC_TEMPLATE = (topic) => `# ${topic} · 選題依據

## 為什麼現在做這題

（熱度來源：貼文連結、互動數、日期。從 content/scout/ 的 trends.json 挑進來的話，把該筆記錄貼過來。）

## 目標受眾與切角

（誰會看？這個題目我們的獨特切角是什麼？）

## 參考資料

- （連結 + 一句話說明）
`;

const MASTER_TEMPLATE = (topic) => `# ${topic} · 長篇母稿

<!-- 先寫完整論述（目標 800–1500 字），確認事實與來源後再拆集。 -->
<!-- 拆集原則：每集一個論點、自帶 hook 與收尾，能獨立看懂；集與集之間可以互相導流。 -->
`;

const EPISODE_TEMPLATE = (topic, ep) => `# ${topic} · ep${ep}

<!-- 這一檔就是這一集的逐字稿：video-flow series 會把它複製成該集專案的 SCRIPT.zh-TW.md。 -->
<!-- 結構：hook（第一段，6 秒內）→ 單一論點 → 收尾／CTA。目標 60 秒內（約 240–270 字）。 -->
<!-- 數字與縮寫寫成唸法（例：「BAP」→「B A P」），TTS 與字幕才不會唸錯。 -->
`;
