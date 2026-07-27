import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { projectsRoot, getAspect, getMethod, briefDimensions, t } from '../lib/registry.mjs';
import { heading, bold, grey, green, red, yellow, table } from '../lib/ui.mjs';

export function run(args) {
  const [project, target] = args._;
  if (!project || !target) {
    console.error('用法：video-flow qa <project> <output.mp4> [--narration public/voiceover-edited.wav]');
    process.exit(1);
  }

  const projectDir = join(projectsRoot(), project);
  const briefPath = join(projectDir, 'brief.json');
  const brief = existsSync(briefPath) ? JSON.parse(readFileSync(briefPath, 'utf8')) : null;
  if (!brief) console.log(yellow(`找不到 ${briefPath}，只做通用檢查（不比對交付規格）。`));

  const file = resolve(projectDir, target);
  if (!existsSync(file)) {
    console.error(red(`找不到影片：${file}`));
    process.exit(1);
  }

  const method = brief ? getMethod(brief.method) : null;
  const probe = ffprobe(file);
  const video = probe.streams.find((s) => s.codec_type === 'video');
  const audio = probe.streams.find((s) => s.codec_type === 'audio');
  const volume = volumedetect(file);
  const checks = [];

  // level 'error' fails the run; 'warn' is advisory only (mix taste, not a spec breach).
  const add = (name, pass, detail, level = 'error') => checks.push({ name, pass, detail, level });

  if (!video) add('影像軌存在', false, '找不到影像串流');
  else {
    add('影像編碼 H.264', video.codec_name === 'h264', video.codec_name);
    const dims = `${video.width}x${video.height}`;
    const want = briefDimensions(brief);
    if (want) {
      const target = `${want.width}x${want.height}`;
      add(`尺寸 ${target}`, dims === target, `${dims}${brief.aspect === 'custom' ? '（自訂）' : ` · ${brief.aspect}`}`);
    } else add('尺寸', true, dims);
    add('H.264 偶數尺寸', video.width % 2 === 0 && video.height % 2 === 0, dims);
    const fps = parseFps(video.r_frame_rate);
    add(`幀率 ${brief?.fps ?? 30} fps`, Math.abs(fps - (brief?.fps ?? 30)) < 0.01, `${fps} fps`);
  }

  if (!audio) add('音訊軌存在', false, '找不到音訊串流');
  else {
    add('音訊編碼 AAC', audio.codec_name === 'aac', audio.codec_name);
    add('取樣率 ≥ 44.1 kHz', Number(audio.sample_rate) >= 44100, `${audio.sample_rate} Hz`);
  }

  const duration = Number(probe.format.duration);
  add('片長 > 0', duration > 0, `${duration.toFixed(2)} 秒`);

  if (volume.max_volume != null) {
    add('音訊峰值 < 0 dB', volume.max_volume < 0, `${volume.max_volume} dB`);
    add(
      '平均音量在 -30 ~ -12 dB',
      volume.mean_volume > -30 && volume.mean_volume < -12,
      `${volume.mean_volume} dB（含靜音段，僅供參考）`,
      'warn',
    );
  }

  // 片長須覆蓋完整旁白，不截尾音。
  // brief.narrationFile 是權威來源；沒有的話按慣例猜，並明講猜了哪一個。
  const narration = args.narration
    ? resolve(projectDir, args.narration)
    : brief?.narrationFile
      ? resolve(projectDir, brief.narrationFile)
      : firstExisting(projectDir, NARRATION_CANDIDATES);

  if (narration && existsSync(narration)) {
    const nDur = Number(ffprobe(narration).format.duration);
    const rel = narration.replace(projectDir + '/', '');
    const authoritative = Boolean(args.narration || brief?.narrationFile);
    add(
      '片長覆蓋完整旁白',
      duration >= nDur - 0.05,
      `影片 ${duration.toFixed(2)}s / 旁白 ${nDur.toFixed(2)}s（${rel}${authoritative ? '' : ' — 推測，可用 --narration 指定'}）`,
      authoritative ? 'error' : 'warn',
    );
  } else {
    add(
      '片長覆蓋完整旁白',
      null,
      '找不到旁白檔。用 --narration <path> 指定，或把路徑寫進 brief.json 的 narrationFile',
    );
  }

  // Methods whose QA depends on looking at full-resolution frames get the stills
  // extracted and contact-sheeted automatically, then checked for existence.
  let stills = null;
  if (method?.qaArtifacts?.stills && duration > 0 && !args.noStills) {
    stills = buildReviewSheet(projectDir, file, duration, method.qaArtifacts.count ?? 4);
    add(
      `review still（${method.qaArtifacts.stills === 'required' ? '必要' : '選用'}）`,
      stills.frames.length === (method.qaArtifacts.count ?? 4),
      `${stills.frames.length} 張 → ${stills.dir.replace(projectDir + '/', '')}`,
      method.qaArtifacts.stills === 'required' ? 'error' : 'warn',
    );
    add(
      'contact sheet',
      Boolean(stills.contactSheet),
      stills.contactSheet ? stills.contactSheet.replace(projectDir + '/', '') : '產生失敗',
      'warn',
    );
  }

  if (args.json) {
    console.log(
      JSON.stringify({ file, checks, probe: { duration, video, audio }, volume, stills }, null, 2),
    );
  } else {
    heading(`QA · ${project}`);
    console.log(grey(file) + '\n');
    table(
      checks.map((c) => [
        c.pass === null
          ? yellow('－')
          : c.pass
            ? green('✔')
            : c.level === 'warn'
              ? yellow('!')
              : red('✗'),
        c.name,
        grey(c.detail ?? ''),
      ]),
    );
    const failed = checks.filter((c) => c.pass === false && c.level === 'error');
    const warned = checks.filter((c) => c.pass === false && c.level === 'warn');
    const skippedC = checks.filter((c) => c.pass === null);
    console.log('');
    if (failed.length) console.log(red(`${failed.length} 項未通過`));
    else console.log(green('必要檢查全數通過'));
    if (warned.length) console.log(yellow(`${warned.length} 項待確認（非硬性規格）`));
    if (skippedC.length) console.log(yellow(`${skippedC.length} 項未檢查`));
    console.log(`\n${bold('仍需人工確認：')}`);
    const manual = [
      '字幕與語音同步，沒有提前或落後',
      `底部安全區沒有被平台 UI 遮擋（${brief?.aspectSize ?? '本次尺寸'}）`,
      '背景音樂聽得到但不蓋過旁白',
      '畫面中的數字、日期、人名與關係正確',
    ];
    const artifactNote = t(method?.qaArtifacts?.note);
    if (artifactNote) manual.push(artifactNote);
    manual.forEach((s) => console.log(grey(`  · ${s}`)));
    if (stills?.contactSheet) {
      console.log(`\n${bold('請看：')} ${stills.contactSheet}`);
    }
  }

  const reportPath = join(projectDir, 'qa-report.json');
  writeFileSync(
    reportPath,
    JSON.stringify({ file, checkedAt: new Date().toISOString(), checks }, null, 2) + '\n',
  );
  if (!args.json) console.log(grey(`\n報告：${reportPath}`));

  if (checks.some((c) => c.pass === false && c.level === 'error')) process.exitCode = 1;
}

/**
 * Extract evenly-spaced full-resolution stills plus a contact sheet, so the
 * "check the densest information frame at full res" QA step has something to check
 * instead of being an instruction nobody follows.
 */
function buildReviewSheet(projectDir, file, duration, count) {
  const dir = join(projectDir, 'qa', 'stills');
  mkdirSync(dir, { recursive: true });

  const frames = [];
  for (let i = 0; i < count; i++) {
    // Sample inside the clip, avoiding the very first and last frame.
    const at = (duration * (i + 0.5)) / count;
    const out = join(dir, `${String(i + 1).padStart(2, '0')}-${at.toFixed(2)}s.png`);
    const r = spawnSync(
      'ffmpeg',
      ['-hide_banner', '-loglevel', 'error', '-y', '-ss', at.toFixed(3), '-i', file, '-frames:v', '1', out],
      { encoding: 'utf8' },
    );
    if (r.status === 0 && existsSync(out)) frames.push({ at: Number(at.toFixed(2)), path: out });
  }

  let contactSheet = null;
  if (frames.length) {
    const cols = Math.min(frames.length, 3);
    const rows = Math.ceil(frames.length / cols);
    const sheet = join(projectDir, 'qa', 'contact-sheet.jpg');
    const r = spawnSync(
      'ffmpeg',
      [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-pattern_type', 'glob', '-i', join(dir, '*.png'),
        '-filter_complex', `scale=640:-1,tile=${cols}x${rows}:padding=8:margin=8:color=0x1b1b1b`,
        '-frames:v', '1', sheet,
      ],
      { encoding: 'utf8' },
    );
    if (r.status === 0 && existsSync(sheet)) contactSheet = sheet;
  }

  return { dir, frames, contactSheet };
}

const NARRATION_CANDIDATES = [
  'public/voiceover-edited.wav',
  'public/voiceover-edited.m4a',
  'public/audio/voiceover-edited.wav',
  'public/audio/voiceover-edited.m4a',
  'public/voiceover-final.wav',
  'public/audio/voiceover-final.wav',
];

function ffprobe(file) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  return JSON.parse(out);
}

function volumedetect(file) {
  // volumedetect reports on stderr, so spawnSync (not execFileSync) to capture it.
  const r = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  return parseVolume(`${r.stderr ?? ''}${r.stdout ?? ''}`);
}

function parseVolume(text) {
  const mean = /mean_volume:\s*(-?[\d.]+) dB/.exec(text);
  const max = /max_volume:\s*(-?[\d.]+) dB/.exec(text);
  return {
    mean_volume: mean ? Number(mean[1]) : null,
    max_volume: max ? Number(max[1]) : null,
  };
}

function parseFps(r) {
  if (!r) return 0;
  const [n, d] = r.split('/').map(Number);
  return d ? n / d : n;
}

function firstExisting(dir, candidates) {
  for (const c of candidates) {
    const p = join(dir, c);
    if (existsSync(p)) return p;
  }
  return null;
}
