import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { projectsRoot, readBrief, REPO_ROOT } from '../lib/registry.mjs';
import { heading, bold, grey, green, yellow, red } from '../lib/ui.mjs';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/audio/speech';
const FAL_INITIATE_URL = process.env.FAL_STORAGE_INITIATE_URL ?? 'https://rest.alpha.fal.ai/storage/upload/initiate';
const FAL_QUEUE_BASE = process.env.FAL_QUEUE_BASE ?? 'https://queue.fal.run';

/**
 * tts-gen 階段的執行器。兩種模式，必須擇一明講：
 *   video-flow tts <project> --sample   # 只合成第一段 → public/voice/sample.mp3，供試聽關卡
 *   video-flow tts <project> --full     # 逐段合成 → 串接 voiceover-raw.wav → 衍生 voiceover-edited.wav
 * 沒有預設模式——這是付費 API，不能因為少打一個 flag 就把整篇稿都燒下去。
 */
export async function run(args) {
  const project = args._[0];
  if (!project || (!args.sample && !args.full)) {
    console.error('用法：video-flow tts <project> --sample   （先試聽，人工確認聲線）');
    console.error('　　　video-flow tts <project> --full     （確認後合成完整旁白）');
    process.exit(1);
  }

  const brief = readBrief(project);
  if (!brief) {
    console.error(red(`找不到 ${join(projectsRoot(), project, 'brief.json')}。先跑：video-flow intake`));
    process.exit(1);
  }
  if (brief.voice !== 'tts') {
    console.error(red(`這個專案的配音是「${brief.voice ?? '未確認'}」，不是 AI TTS，不該跑 tts-gen。`));
    process.exit(1);
  }
  if (!brief.ttsModel || !brief.ttsVoice) {
    console.error(red('brief.json 缺 ttsModel／ttsVoice。回到 intake 補確認，不得用預設值。'));
    process.exit(1);
  }

  const projectDir = join(projectsRoot(), project);
  const scriptPath = join(projectDir, brief.scriptFile ?? 'SCRIPT.zh-TW.md');
  if (!existsSync(scriptPath)) {
    console.error(red(`找不到逐字稿：${scriptPath}`));
    process.exit(1);
  }
  const segments = parseScript(readFileSync(scriptPath, 'utf8'));
  if (!segments.length) {
    console.error(red('逐字稿解析後沒有任何可合成的段落。'));
    process.exit(1);
  }

  const provider = providerFor(brief.ttsModel);
  const apiKeyEnv = provider === 'fal' ? 'FAL_KEY' : 'OPENROUTER_API_KEY';
  const apiKey = resolveApiKey(apiKeyEnv);
  if (!apiKey) {
    console.error(red(`.env 或環境變數找不到 ${apiKeyEnv}。`));
    process.exit(1);
  }

  heading(`TTS 配音生成 · ${project}`);
  console.log(grey(`服務 ${provider} · 模型 ${brief.ttsModel} · 聲線 ${brief.ttsVoice} · 逐字稿 ${segments.length} 段\n`));

  const voiceDir = join(projectDir, 'public', 'voice');

  if (args.sample) {
    mkdirSync(voiceDir, { recursive: true });
    const samplePath = join(voiceDir, 'sample.mp3');
    const audio = await synthesise(apiKey, brief, segments[0], projectDir);
    writeFileSync(samplePath, audio);
    console.log(`${green('✔')} 試聽片段：${samplePath}`);
    console.log(grey(`  內容：${segments[0].slice(0, 40)}…`));
    console.log(yellow('  請使用者試聽確認聲線、語速與斷句，確認後再跑 --full。'));
    return;
  }

  // --full
  const rawPath = join(projectDir, 'public', 'voiceover-raw.wav');
  if (existsSync(rawPath) && !args.force) {
    console.error(red(`${rawPath} 已存在，不得覆寫。`));
    console.error(grey('確定要重新合成請加 --force（舊檔會先改名保留）。'));
    process.exit(1);
  }
  if (existsSync(rawPath) && args.force) {
    const backup = rawPath.replace(/\.wav$/, `.replaced-${Date.now()}.wav`);
    copyFileSync(rawPath, backup);
    console.log(grey(`既有 raw 已備份為 ${backup}`));
  }

  const segDir = join(voiceDir, 'segments');
  mkdirSync(segDir, { recursive: true });
  const onlyIds = args.only
    ? new Set(
        String(args.only)
          .split(',')
          .map((value) => String(Number(value.trim())).padStart(2, '0')),
      )
    : null;
  if (onlyIds && !args.force) {
    console.error(red('--only 是指定段落修復模式，必須搭配 --force，舊段落會先備份。'));
    process.exit(1);
  }
  const replacedAt = Date.now();

  const generations = [];
  const wavs = [];
  for (const [i, text] of segments.entries()) {
    const id = String(i + 1).padStart(2, '0');
    const mp3 = join(segDir, `${id}.mp3`);
    const wav = join(segDir, `${id}.wav`);
    if (onlyIds && !onlyIds.has(id)) {
      if (!existsSync(mp3) || !existsSync(wav)) {
        console.error(red(`--only 修復需要既有 ${id}.mp3／${id}.wav，但檔案不完整。`));
        process.exit(1);
      }
      wavs.push(wav);
      generations.push({
        id,
        model: brief.ttsModel,
        voice: brief.ttsVoice,
        input: text,
        output: `public/voice/segments/${id}.mp3`,
        reused: true,
      });
      console.log(grey(`  ${id}/${String(segments.length).padStart(2, '0')} 沿用既有段落`));
      continue;
    }
    if (onlyIds && existsSync(mp3)) {
      copyFileSync(mp3, mp3.replace(/\.mp3$/, `.replaced-${replacedAt}.mp3`));
    }
    if (onlyIds && existsSync(wav)) {
      copyFileSync(wav, wav.replace(/\.wav$/, `.replaced-${replacedAt}.wav`));
    }
    const audio = await synthesise(apiKey, brief, text, projectDir);
    writeFileSync(mp3, audio);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp3, '-ar', '48000', '-ac', '2', wav]);
    wavs.push(wav);
    generations.push({
      id,
      model: brief.ttsModel,
      voice: brief.ttsVoice,
      input: text,
      output: `public/voice/segments/${id}.mp3`,
      ...(onlyIds ? { repairedAt: new Date().toISOString() } : {}),
    });
    console.log(grey(`  ${id}/${String(segments.length).padStart(2, '0')} 段完成（${audio.length} bytes）`));
  }
  const generationsPath = join(segDir, 'generations.json');
  if (existsSync(generationsPath) && args.force) {
    copyFileSync(
      generationsPath,
      generationsPath.replace(/\.json$/, `.replaced-${replacedAt}.json`),
    );
  }
  writeFileSync(generationsPath, JSON.stringify(generations, null, 2) + '\n');

  // 段落之間補一小段靜音當自然換氣；段內停頓交給 TTS 自己。
  const gapSec = Number(args.gap) || 0.35;
  const gap = join(segDir, 'gap.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `anullsrc=r=48000:cl=stereo`, '-t', String(gapSec), gap]);
  const listPath = join(segDir, 'concat.txt');
  writeFileSync(listPath, wavs.map((w) => `file '${w}'`).join(`\nfile '${gap}'\n`) + '\n');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', rawPath]);
  rmSync(gap);
  rmSync(listPath);

  // TTS 合成音沒有贅詞與長停頓可剪，edited 直接由 raw 衍生，維持下游時間軸契約。
  const editedPath = join(projectDir, 'public', 'voiceover-edited.wav');
  if (existsSync(editedPath) && args.force) {
    copyFileSync(
      editedPath,
      editedPath.replace(/\.wav$/, `.replaced-${replacedAt}.wav`),
    );
  }
  copyFileSync(rawPath, editedPath);

  const dur = probeDuration(rawPath);
  console.log(`\n${green('✔')} 旁白合成完成`);
  console.log(`  ${rawPath}${dur ? grey(`  （${dur.toFixed(1)} 秒）`) : ''}`);
  console.log(`  ${editedPath}  ${grey('（由 raw 衍生，時間軸基準）')}`);
  console.log(grey(`\n接著跑：video-flow done ${project} tts-gen --approved-by "<誰確認的>"`));
}

/** 把 markdown 逐字稿整理成 TTS 段落：一個空行分隔的段落＝一段合成。 */
export function parseScript(md) {
  const cleaned = md
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s.*$/gm, '')
    .replace(/^(-{3,}|\*{3,})\s*$/gm, '')
    .replace(/^[ \t]*[-*+][ \t]+/gm, '')
    .replace(/^[ \t]*\d+\.[ \t]+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
  return cleaned
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, '').trim())
    .filter((p) => p.length > 0);
}

async function synthesise(apiKey, brief, input, projectDir) {
  if (providerFor(brief.ttsModel) === 'fal') {
    return synthesiseFal(apiKey, brief, input, projectDir);
  }
  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://local.seedance.video',
      'X-Title': `video-flow tts · ${brief.project}`,
    },
    body: JSON.stringify({
      model: brief.ttsModel,
      input,
      voice: brief.ttsVoice,
      response_format: 'mp3',
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`TTS 合成失敗（${response.status}）：${message.slice(0, 300)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function providerFor(model) {
  return String(model).startsWith('fal-ai/') ? 'fal' : 'openrouter';
}

async function synthesiseFal(apiKey, brief, input, projectDir) {
  const profile = await ensureFalVoiceProfile(apiKey, brief, projectDir);
  const payload = await falQueue(apiKey, brief.ttsModel, {
    text: input,
    language: 'Chinese',
    speaker_voice_embedding_file_url: profile.speakerEmbeddingUrl,
    reference_text: profile.referenceText,
  });
  const audioUrl = payload?.audio?.url;
  if (!audioUrl) {
    throw new Error(`fal Qwen TTS 回傳缺少 audio.url：${JSON.stringify(payload).slice(0, 300)}`);
  }
  return downloadBuffer(audioUrl);
}

async function ensureFalVoiceProfile(apiKey, brief, projectDir) {
  const source = resolveVoiceSource(brief.ttsVoice, projectDir);
  if (!source) {
    throw new Error(`找不到 fal 聲音來源：${brief.ttsVoice}`);
  }
  const variant = brief.ttsModel.split('/').pop();
  const cachePath = /\.zip$/i.test(source)
    ? source.replace(/(?:\.voicebox)?\.zip$/i, `.fal-${variant}.json`)
    : `${source}.fal-${variant}.json`;
  if (existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, 'utf8'));
    if (cached.speakerEmbeddingUrl && cached.referenceText) return cached;
  }

  const voice = unpackVoicebox(source, projectDir);
  console.log(grey(`  建立 fal Qwen 聲音 embedding：${voice.profileName}`));
  const audioUrl = await falUpload(apiKey, voice.audioPath, 'audio/wav');
  const cloneModel = brief.ttsModel.replace('/text-to-speech/', '/clone-voice/');
  const cloned = await falQueue(apiKey, cloneModel, {
    audio_url: audioUrl,
    reference_text: voice.referenceText,
  });
  const speakerEmbeddingUrl = cloned?.speaker_embedding?.url;
  if (!speakerEmbeddingUrl) {
    throw new Error(`fal clone-voice 回傳缺少 speaker_embedding.url：${JSON.stringify(cloned).slice(0, 300)}`);
  }
  const profile = {
    provider: 'fal.ai',
    model: cloneModel,
    profileName: voice.profileName,
    voiceSource: relativePath(source),
    referenceText: voice.referenceText,
    speakerEmbeddingUrl,
    createdAt: new Date().toISOString(),
  };
  writeFileSync(cachePath, JSON.stringify(profile, null, 2) + '\n');
  return profile;
}

function resolveVoiceSource(given, projectDir) {
  const candidates = [
    isAbsolute(given) ? given : null,
    join(projectDir, given),
    join(REPO_ROOT, given),
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) ?? null;
}

function unpackVoicebox(source, projectDir) {
  if (!/\.zip$/i.test(source)) {
    return { profileName: basename(source), audioPath: source, referenceText: '' };
  }
  const entries = String(execFileSync('unzip', ['-Z', '-1', source])).trim().split('\n');
  const sampleEntry = entries.find((e) => /^samples\/.*\.(wav|mp3|m4a)$/i.test(e));
  if (!sampleEntry) throw new Error(`Voicebox ZIP 沒有 samples/* 音檔：${source}`);
  const manifest = JSON.parse(String(execFileSync('unzip', ['-p', source, 'manifest.json'])));
  const samples = JSON.parse(String(execFileSync('unzip', ['-p', source, 'samples.json'])));
  const referenceText = samples[sampleEntry] ?? samples[basename(sampleEntry)];
  if (!referenceText) throw new Error(`Voicebox ZIP 的 samples.json 缺少 ${sampleEntry} 逐字稿`);
  const workDir = join(projectDir, '.tts-work');
  mkdirSync(workDir, { recursive: true });
  const audioPath = join(workDir, basename(sampleEntry));
  writeFileSync(audioPath, execFileSync('unzip', ['-p', source, sampleEntry], { maxBuffer: 50 * 1024 * 1024 }));
  return {
    profileName: manifest?.profile?.name ?? basename(source),
    audioPath,
    referenceText: String(referenceText).trim(),
  };
}

async function falUpload(apiKey, file, contentType) {
  const initiate = await fetch(FAL_INITIATE_URL, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content_type: contentType, file_name: basename(file) }),
  });
  if (!initiate.ok) {
    throw new Error(`fal 上傳初始化失敗（${initiate.status}）：${(await initiate.text()).slice(0, 300)}`);
  }
  const { file_url, upload_url } = await initiate.json();
  const put = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: readFileSync(file),
  });
  if (!put.ok) throw new Error(`fal 上傳失敗（${put.status}）：${(await put.text()).slice(0, 300)}`);
  console.log(grey(`  上傳 ${basename(file)}（${(statSync(file).size / 1e6).toFixed(1)} MB）`));
  return file_url;
}

async function falQueue(apiKey, model, input) {
  const auth = { Authorization: `Key ${apiKey}` };
  const submit = await fetch(`${FAL_QUEUE_BASE}/${model}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!submit.ok) throw new Error(`fal ${model} 提交失敗（${submit.status}）：${(await submit.text()).slice(0, 300)}`);
  const queued = await submit.json();
  const statusUrl = queued.status_url ?? `${FAL_QUEUE_BASE}/${model}/requests/${queued.request_id}/status`;
  const responseUrl = queued.response_url ?? `${FAL_QUEUE_BASE}/${model}/requests/${queued.request_id}`;
  for (let i = 0; i < 600; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusResponse = await fetch(statusUrl, { headers: auth });
    if (!statusResponse.ok) {
      throw new Error(`fal 狀態查詢失敗（${statusResponse.status}）：${(await statusResponse.text()).slice(0, 300)}`);
    }
    const { status } = await statusResponse.json();
    if (status === 'COMPLETED') break;
    if (status === 'FAILED' || status === 'CANCELLED') throw new Error(`fal ${model} 任務 ${status}`);
    if (i === 599) throw new Error(`fal ${model} 等待超過 20 分鐘`);
  }
  const result = await fetch(responseUrl, { headers: auth });
  if (!result.ok) throw new Error(`fal 結果下載失敗（${result.status}）：${(await result.text()).slice(0, 300)}`);
  return result.json();
}

async function downloadBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`音訊下載失敗（${response.status}）：${url}`);
  return Buffer.from(await response.arrayBuffer());
}

function resolveApiKey(apiKeyEnv) {
  if (process.env[apiKeyEnv]) return process.env[apiKeyEnv];
  const envPath = join(REPO_ROOT, '.env');
  if (!existsSync(envPath)) return null;
  const m = readFileSync(envPath, 'utf8').match(new RegExp(`^\\s*${apiKeyEnv}\\s*=\\s*(.+)\\s*$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

function relativePath(path) {
  const absolute = resolve(path);
  return absolute.startsWith(REPO_ROOT + '/') ? absolute.slice(REPO_ROOT.length + 1) : absolute;
}

function probeDuration(file) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    const n = Number(String(out).trim());
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
