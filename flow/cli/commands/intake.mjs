import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  methods,
  questions,
  filterMethods,
  planFor,
  t,
  projectsRoot,
  REPO_ROOT,
} from '../lib/registry.mjs';
import { composeBrief } from '../lib/brief.mjs';
import { createPrompter, heading, bold, grey, green, yellow, red } from '../lib/ui.mjs';

/**
 * Two ways in:
 *   1. `video-flow intake` — guided Q&A for a human at a terminal.
 *   2. `video-flow intake --project x --input ... --method ...` — non-interactive,
 *      for an agent that already asked the user these questions in conversation.
 * Either way the answers land in the same brief.json.
 */
export async function run(args) {
  const reg = methods();
  const qs = questions();
  const p = await createPrompter();
  const answers = {};

  // A flag-supplied answer is used as-is; anything missing gets asked.
  const pickChoice = async (key, prompt, options, opts = {}) => {
    const supplied = args[key];
    if (supplied && supplied !== true) {
      const match = options.find((o) => o.id === supplied);
      if (!match) {
        throw new Error(
          `--${key} 的值「${supplied}」無效。可用：${options.map((o) => o.id).join('、')}`,
        );
      }
      console.log(`${bold('?')} ${prompt} ${green(match.label ?? match.id)}`);
      return match;
    }
    return p.choose(prompt, options, opts);
  };

  const pickText = async (key, prompt, opts = {}) => {
    const supplied = args[key];
    if (supplied && supplied !== true) {
      console.log(`${bold('?')} ${prompt} ${green(supplied)}`);
      return supplied;
    }
    return p.text(prompt, opts);
  };

  try {
    heading('影片製作需求確認');
    console.log(grey('每一題都需要明確答案。前一支影片的設定不會沿用。\n'));
    qs.rules['zh-TW'].forEach((r) => console.log(grey(`  · ${r}`)));

    const projectQ = qs.questions.find((q) => q.id === 'project');
    answers.project = await pickText('project', t(projectQ.prompt), { validate: projectQ.validate });

    const projectDir = join(projectsRoot(), answers.project);
    const briefPath = join(projectDir, 'brief.json');
    if (existsSync(briefPath) && !args.force) {
      console.log(red(`\n${briefPath} 已存在。`));
      console.log(grey('要重新確認需求請加 --force，或改用其他專案代號。'));
      p.close();
      process.exit(1);
    }

    const inputQ = qs.questions.find((q) => q.id === 'input');
    const inputChoice = await pickChoice(
      'input',
      t(inputQ.prompt),
      reg.inputTypes.map((i) => ({ id: i.id, label: t(i.name), hint: t(i.note) })),
      { note: t(inputQ.note) },
    );
    answers.input = inputChoice.id;

    const aspectQ = qs.questions.find((q) => q.id === 'aspect');
    const aspectOptions = reg.aspects
      .filter((a) => a.id !== 'source' || answers.input === 'existing-clip')
      .map((a) => ({
        id: a.id,
        label: `${t(a.name)}  ${a.size}`,
        hint: a.platforms.length ? a.platforms.join('、') : '',
      }));
    const aspectChoice = await pickChoice('aspect', t(aspectQ.prompt), aspectOptions, {
      note: t(aspectQ.note),
    });
    answers.aspect = aspectChoice.id;

    // A custom canvas needs real numbers before anything downstream can lay out safe areas.
    if (answers.aspect === 'custom') {
      answers.width = await askDimension(pickText, 'width', '畫布寬度（px）');
      answers.height = await askDimension(pickText, 'height', '畫布高度（px）');
      if (answers.width % 2 || answers.height % 2) {
        console.log(yellow(`  注意：H.264 需要偶數尺寸，${answers.width}×${answers.height} 會讓渲染失敗或被自動調整。`));
      }
    }

    // Method options are narrowed by the two answers above — that filtering is the
    // point of asking them first.
    const { eligible, excluded } = filterMethods({ input: answers.input, aspect: answers.aspect });
    if (!eligible.length) {
      console.log(red('\n這個輸入與比例的組合目前沒有任何製作方式支援。'));
      excluded.forEach(({ method, reasons }) =>
        console.log(grey(`  ${method.code} ${t(method.name)}：${reasons.join('；')}`)),
      );
      p.close();
      process.exit(1);
    }
    if (excluded.length) {
      console.log(grey(`\n依前兩題已排除 ${excluded.length} 套方式：`));
      excluded.forEach(({ method, reasons }) =>
        console.log(grey(`  ✗ ${method.code} ${t(method.name)} — ${reasons.join('；')}`)),
      );
    }

    const methodQ = qs.questions.find((q) => q.id === 'method');
    const methodOptions = eligible.flatMap((m) => {
      const label = `${m.code} ${t(m.name)}`;
      const hint = `${t(m.tagline)}${(m.requires.env ?? []).length ? `  （需 ${m.requires.env.join('、')}）` : ''}`;
      // accept either the id or the M-code on the command line
      return [{ id: m.id, alias: m.code.toLowerCase(), label, hint }];
    });
    if (args.method && args.method !== true) {
      const needle = String(args.method).toLowerCase();
      const hit = methodOptions.find((o) => o.id === needle || o.alias === needle);
      if (!hit) {
        const ruled = excluded.find(
          ({ method }) => method.id === needle || method.code.toLowerCase() === needle,
        );
        throw new Error(
          ruled
            ? `--method ${args.method} 已被前兩題排除：${ruled.reasons.join('；')}`
            : `--method ${args.method} 無效。可用：${methodOptions.map((o) => o.alias).join('、')}`,
        );
      }
      args.method = hit.id;
    }
    const methodChoice = await pickChoice('method', t(methodQ.prompt), methodOptions, {
      note: t(methodQ.note),
    });
    answers.method = methodChoice.id;

    const { method: chosen, plan } = planFor(answers.method, { input: answers.input });
    const skipped = new Set(plan.filter((s) => s.status === 'skip').map((s) => s.stage.id));

    for (const q of qs.questions.filter((q) => q.order >= 5).sort((a, b) => a.order - b.order)) {
      if (q.skipIf?.stageSkipped && skipped.has(q.skipIf.stageSkipped)) {
        console.log(grey(`\n（跳過「${t(q.prompt)}」— 這套方式不跑 ${q.skipIf.stageSkipped} 階段）`));
        continue;
      }
      if (q.skipIf?.answerNot) {
        const [key, needed] = Object.entries(q.skipIf.answerNot)[0];
        const accepted = Array.isArray(needed) ? needed : [needed];
        if (!accepted.includes(answers[key])) continue;
      }

      if (q.type === 'text') {
        answers[q.id] = await pickText(q.id, t(q.prompt), { defaultValue: q.default });
        continue;
      }

      const choice = await pickChoice(
        q.id,
        t(q.prompt),
        q.options.map((o) => ({ ...o, label: t(o.name), hint: t(o.note) })),
        { note: t(q.note) },
      );
      answers[q.id] = choice.id;
      for (const f of choice.followUp ?? []) {
        if (f.requiresEnv) {
          const missing = f.requiresEnv.filter((k) => !envHas(k));
          if (missing.length) console.log(yellow(`  提醒：.env 尚未設定 ${missing.join('、')}`));
        }
        answers[f.id] = await pickText(f.id, t(f.prompt));
      }
    }

    const missingEnv = (chosen.requires.env ?? []).filter((k) => !envHas(k));
    if (missingEnv.length) {
      console.log(yellow(`\n注意：${chosen.code} 需要 .env 設定 ${missingEnv.join('、')}，目前找不到。`));
    }

    const brief = composeBrief(answers, reg, chosen, { fps: Number(args.fps) || 30 });

    mkdirSync(projectDir, { recursive: true });
    writeFileSync(briefPath, JSON.stringify(brief, null, 2) + '\n');

    heading('確認結果');
    summarise(brief, chosen, reg);
    console.log(`\n${green('已寫入')} ${briefPath}`);
    console.log(grey(`接著跑：video-flow plan ${answers.project}`));
  } finally {
    p.close();
  }
}

async function askDimension(pickText, key, prompt) {
  const raw = await pickText(key, prompt, { validate: '^[0-9]{2,5}$' });
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 16) throw new Error(`${prompt} 無效：${raw}`);
  return n;
}

function envHas(key) {
  if (process.env[key]) return true;
  const envPath = join(REPO_ROOT, '.env');
  if (!existsSync(envPath)) return false;
  return new RegExp(`^\\s*${key}\\s*=\\s*\\S`, 'm').test(readFileSync(envPath, 'utf8'));
}

function summarise(brief, method, reg) {
  const rows = [
    ['專案', brief.project],
    ['輸入素材', t(reg.inputTypes.find((i) => i.id === brief.input)?.name)],
    ['交付尺寸', `${brief.aspect}  ${brief.aspectSize ?? ''}  @ ${brief.fps}fps`],
    ['製作方式', `${method.code} ${t(method.name)}`],
    ['配音', brief.voice === 'tts' ? `AI TTS · ${brief.ttsModel} · ${brief.ttsVoice}` : brief.voice ?? '—'],
    [
      '字幕',
      `${brief.captions ?? '—'} · ${
        brief.captionLanguages === 'custom'
          ? brief.captionLanguageSpec
          : (brief.captionLanguages ?? '—')
      }`,
    ],
    ['Avatar', describeAvatar(brief)],
    ['吉祥物', brief.mascot],
    ['BGM', brief.bgm + (brief.bgmSource ? ` · ${brief.bgmSource}` : '') + (brief.bgmLicense ? ` · ${brief.bgmLicense}` : '')],
    ['目標片長', brief.targetDuration],
  ];
  rows.forEach(([k, v]) => console.log(`  ${grey(k.padEnd(6))} ${v}`));
}

function describeAvatar(brief) {
  if (brief.avatarMode === 'live-video') return `真人影片 · ${brief.avatarSource}`;
  if (brief.avatarMode === 'anime-presenter') return `二次元人物 · ${brief.avatarAsset}`;
  if (brief.avatarMode === 'ai-lipsync') {
    return `AI lip-sync · ${brief.avatarProvider} · ${brief.avatarSource} · ${brief.avatarEndpointEnv}`;
  }
  if (brief.avatarMode === 'none') return '不使用';
  return '—';
}
