import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  methods,
  questions,
  filterMethods,
  planFor,
  getMethod,
  t,
  projectsRoot,
  contentRoot,
  REPO_ROOT,
} from '../lib/registry.mjs';
import { composeBrief } from '../lib/brief.mjs';
import { heading, bold, grey, green, yellow, red } from '../lib/ui.mjs';

/**
 * 系列批量 intake：一個長篇拆出的多集共用一份設定，逐集產生 brief.json 與 SCRIPT.zh-TW.md。
 *
 * 逐題確認的原則不變，只是「一次確認、整套系列生效」——所有共用答案必須由使用者
 * 在對話中明確表態後以 flag 傳入，缺一題就整批擋下，不替任何題目補預設值。
 * （唯一例外：input 固定是 script-text——分集稿就是逐字稿，這不是一個可選的題目。）
 *
 *   video-flow series <topic> --method m1 --aspect 9:16 --voice tts --tts-model ... --tts-voice ... \
 *     --captions plain --caption-languages zh-only --avatar-mode none --bgm none
 */
export function run(args) {
  const topic = args._[0];
  if (!topic) {
    console.error('用法：video-flow series <topic-slug> --method ... --aspect ... --voice ... --captions ... --caption-languages ... --avatar-mode ... --bgm ...');
    process.exit(1);
  }

  const epDir = join(contentRoot(), topic, 'episodes');
  if (!existsSync(epDir)) {
    console.error(red(`找不到 ${epDir}。先跑：video-flow script ${topic} --init 並完成分集稿。`));
    process.exit(1);
  }
  const episodes = readdirSync(epDir).filter((f) => /^ep\d+\..*\.md$/.test(f)).sort();
  if (!episodes.length) {
    console.error(red(`${epDir} 沒有分集稿（ep01.zh-TW.md…）。`));
    process.exit(1);
  }

  const reg = methods();
  const qs = questions();
  const problems = [];
  const need = (key, label) => {
    const v = args[key];
    if (v === undefined || v === true) problems.push(`--${flag(key)}（${label}）`);
    return v === true ? undefined : v;
  };

  // 核心答案：全部要使用者本次明確表態，缺了就整批擋下。
  const input = 'script-text';
  const methodArg = need('method', '製作方式');
  const aspect = need('aspect', '交付比例');
  const voice = need('voice', '配音');
  const captions = need('captions', '字幕');
  const captionLanguages = need('captionLanguages', '字幕語言層級');
  const avatarMode = need('avatarMode', '主講人 Avatar');
  const bgm = need('bgm', 'BGM');
  if (problems.length) {
    console.error(red('系列共用設定不完整，缺：'));
    problems.forEach((p) => console.error(red(`  ${p}`)));
    console.error(grey('每一題都需要使用者明確表態；series 不替任何題目假設預設值。'));
    process.exit(1);
  }

  const chosen = getMethod(methodArg);
  if (!chosen) exitWith(`--method ${methodArg} 無效。`);
  const { eligible, excluded } = filterMethods({ input, aspect });
  if (!eligible.some((m) => m.id === chosen.id)) {
    const why = excluded.find((e) => e.method.id === chosen.id)?.reasons.join('；') ?? '不明原因';
    exitWith(`${chosen.code} 不適用：${why}`);
  }

  // 選項值對 questions.json 驗證，跟 intake 同一套詞彙。
  checkOption(qs, 'voice', voice);
  checkOption(qs, 'captions', captions);
  checkOption(qs, 'captionLanguages', captionLanguages);
  checkOption(qs, 'avatarMode', avatarMode);
  checkOption(qs, 'bgm', bgm);
  // 吉祥物只在設計高光字幕時是題目（同 intake 的 skipIf）；此時必答，不補預設。
  let mascot = 'none';
  if (captions === 'designed') {
    mascot = need('mascot', '吉祥物／陪伴角色');
    if (mascot !== undefined) checkOption(qs, 'mascot', mascot);
  }

  const followUps = {};
  if (voice === 'tts') {
    followUps.ttsModel = need('ttsModel', 'TTS 模型');
    followUps.ttsVoice = need('ttsVoice', 'TTS 聲線');
  }
  if (avatarMode === 'live-video') followUps.avatarSource = need('avatarSource', '真人 Avatar 影片路徑');
  if (avatarMode === 'anime-presenter') followUps.avatarAsset = need('avatarAsset', '二次元素材包路徑');
  if (avatarMode === 'ai-lipsync') {
    followUps.avatarSource = need('avatarSource', 'lip-sync 真人 Avatar 影片路徑');
    followUps.avatarProvider = need('avatarProvider', 'lip-sync provider');
    followUps.avatarEndpointEnv = need('avatarEndpointEnv', '端點 .env 變數名稱');
    followUps.avatarApiKeyEnv = need('avatarApiKeyEnv', 'API key .env 變數名稱');
  }
  let bgmSources = [];
  if (bgm === 'supplied') {
    const raw = need('bgmSource', 'BGM 曲目來源；多集可傳 JSON 字串陣列');
    followUps.bgmLicense = need('bgmLicense', 'BGM 授權與標註方式');
    if (raw !== undefined) {
      try {
        bgmSources = String(raw).trim().startsWith('[') ? JSON.parse(raw) : [raw];
      } catch {
        problems.push('--bgm-source（JSON 陣列格式無效）');
      }
      if (!Array.isArray(bgmSources) || !bgmSources.every((v) => typeof v === 'string' && v.length)) {
        problems.push('--bgm-source（必須是非空路徑或 JSON 字串陣列）');
      } else if (![1, episodes.length].includes(bgmSources.length)) {
        problems.push(`--bgm-source（需提供 1 首共用曲目或 ${episodes.length} 首逐集曲目，目前 ${bgmSources.length} 首）`);
      }
    }
  }
  if (captionLanguages === 'custom') followUps.captionLanguageSpec = need('captionLanguageSpec', '字幕語言組合');
  if (problems.length) {
    console.error(red('系列共用設定不完整，缺：'));
    problems.forEach((p) => console.error(red(`  ${p}`)));
    process.exit(1);
  }

  heading(`系列 intake · ${topic} · ${episodes.length} 集`);
  console.log(grey(`${chosen.code} ${t(chosen.name)} · ${aspect} · 配音 ${voice}${voice === 'tts' ? `（${followUps.ttsModel} / ${followUps.ttsVoice}）` : ''} · 字幕 ${captions}/${captionLanguages} · Avatar ${avatarMode} · BGM ${bgm}\n`));

  const created = [];
  for (const [episodeIndex, file] of episodes.entries()) {
    const ep = file.match(/^(ep\d+)\./)[1];
    const project = `${topic}-${ep}`;
    const projectDir = join(projectsRoot(), project);
    const briefPath = join(projectDir, 'brief.json');
    if (existsSync(briefPath) && !args.force) {
      console.log(yellow(`  ⏭ ${project} 已存在 brief.json，略過（要重建加 --force）`));
      continue;
    }

    const answers = {
      project,
      input,
      aspect,
      method: chosen.id,
      voice,
      captions,
      captionLanguages,
      avatarMode,
      mascot,
      bgm,
      duration: args.duration && args.duration !== true ? args.duration : '依旁白',
      ...followUps,
      ...(bgm === 'supplied'
        ? { bgmSource: bgmSources.length === 1 ? bgmSources[0] : bgmSources[episodeIndex] }
        : {}),
      series: {
        topic,
        episode: ep,
        scriptSource: relative(REPO_ROOT, join(epDir, file)),
        confirmedFor: `content/${topic} 全系列`,
      },
    };
    const brief = composeBrief(answers, reg, chosen, { fps: Number(args.fps) || 30 });

    mkdirSync(join(projectDir, 'public'), { recursive: true });
    writeFileSync(briefPath, JSON.stringify(brief, null, 2) + '\n');
    copyFileSync(join(epDir, file), join(projectDir, 'SCRIPT.zh-TW.md'));
    created.push(project);
    console.log(`  ${green('✔')} ${project}  ${grey(`稿件 ${brief.series.scriptSource}`)}`);
  }

  if (!created.length) {
    console.log(yellow('\n沒有建立任何專案。'));
    return;
  }
  const first = created[0];
  const { plan } = planFor(chosen.id, { input, voice });
  const next = plan.find((p) => p.status !== 'skip' && p.stage.id !== 'intake');
  console.log(`\n${green('完成')} ${created.length} 個專案。每集接著跑：`);
  console.log(grey(`  video-flow plan ${first}`));
  if (voice === 'tts') console.log(grey(`  video-flow tts ${first} --sample   # 第一集試聽通過後，同聲線各集可直接 --full`));
  else if (next) console.log(grey(`  下一步：${t(next.stage.name)}`));
  console.log(grey('\n注意：intake 的人工關卡仍要逐集用 done 關閉；series 只是替你把共用答案寫進每一集的 brief。'));

  function exitWith(msg) {
    console.error(red(msg));
    process.exit(1);
  }
}

function checkOption(qs, id, value) {
  const q = qs.questions.find((x) => x.id === id);
  const ids = (q?.options ?? []).map((o) => o.id);
  if (ids.length && !ids.includes(value)) {
    console.error(red(`--${flag(id)} 的值「${value}」無效。可用：${ids.join('、')}`));
    process.exit(1);
  }
}

function flag(camelKey) {
  return camelKey.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
