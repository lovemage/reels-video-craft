import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, isAbsolute } from 'node:path';
import { projectsRoot, readBrief, REPO_ROOT } from '../lib/registry.mjs';
import { heading, bold, grey, green, yellow, red, table } from '../lib/ui.mjs';

const API_KEY_ENV = 'FAL_KEY';
const INITIATE_URL = process.env.FAL_STORAGE_INITIATE_URL ?? 'https://rest.alpha.fal.ai/storage/upload/initiate';
const QUEUE_BASE = process.env.FAL_QUEUE_BASE ?? 'https://queue.fal.run';

/**
 * fal 上的兩個 VEED 對嘴模型。單價差 10 倍，介面完全相同——所以模型是參數，不是寫死的。
 * 價格是 2026-07 從 fal 模型頁抄下來的估算值，實際帳單以 fal dashboard 為準。
 */
const MODELS = {
  'veed/lipsync': { usdPerSecond: 0.4 / 60, note: 'v1 · $0.4/分鐘' },
  'veed/lipsync/v2': { usdPerSecond: 0.07, note: 'v2 · $0.07/秒' },
};
const DEFAULT_MODEL = 'veed/lipsync';

/**
 * avatar-lipsync 階段的執行器。把「一段自己錄的口播素材」對上「本專案的旁白音檔」，
 * 產出可當懸浮頭像用的 public/avatar/avatar-talking.mp4。
 *
 *   video-flow lipsync <project> --sample            # 前 10 秒試跑，看中文口型準不準
 *   video-flow lipsync <project> --ab                # 同一段素材跑 v1 與 v2，並排比價比質
 *   video-flow lipsync <project> --full              # 整條旁白
 *
 * 沒有預設模式——這是付費 API，不能因為少打一個 flag 就把整支片燒下去。
 */
export async function run(args) {
  const project = args._[0];
  const modes = ['sample', 'ab', 'full', 'segment'].filter((m) => args[m]);
  if (!project || modes.length !== 1) {
    console.error('用法：video-flow lipsync <project> --sample   （前 N 秒試跑，預設 10 秒）');
    console.error('　　　video-flow lipsync <project> --ab       （v1 vs v2 對照，跑兩次）');
    console.error('　　　video-flow lipsync <project> --segment  （只生成指定區間，配 --from/--seconds/--label）');
    console.error('　　　video-flow lipsync <project> --full     （確認品質後跑完整旁白）');
    console.error('');
    console.error('選項：--source <影片>   口播素材，預設 public/avatar/presenter-source.mp4');
    console.error('　　　--audio <音檔>    旁白，預設 public/voiceover-edited.wav');
    console.error('　　　--model <id>      veed/lipsync（預設）或 veed/lipsync/v2');
    console.error('　　　--seconds <N>     --sample／--ab／--segment 的秒數，預設 10');
    console.error('　　　--from <sec>      --segment 的旁白起點秒數（預設 0）——頭像不常駐時，只按需生成該視窗');
    console.error('　　　--label <name>    --segment 的輸出名，寫到 avatar-<label>.mp4（預設 segment）');
    console.error('　　　--height <px>     上傳前縮到這個高度；預設 0＝不縮（模型要先偵測人臉，壓小會害到品質）');
    process.exit(1);
  }
  const mode = modes[0];

  const brief = readBrief(project);
  if (!brief) {
    console.error(red(`找不到 ${join(projectsRoot(), project, 'brief.json')}。先跑：video-flow intake`));
    process.exit(1);
  }

  const projectDir = join(projectsRoot(), project);
  const source = resolveInput(args.source ?? brief.avatarSource, projectDir, join('public', 'avatar', 'presenter-source.mp4'));
  if (!source) {
    console.error(red('找不到口播素材影片。'));
    console.error(grey('放一支到 <project>/public/avatar/presenter-source.mp4，或用 --source 指定路徑。'));
    console.error(grey('素材要求：正面對鏡頭、自然講話（別閉嘴不動）、光線穩定、手不擋臉、30–60 秒即可重複使用。'));
    process.exit(1);
  }
  // registry 的契約是 voiceover-edited.*，影片來源的專案抽出來的是 .mp4，所以逐個副檔名試。
  const audio = resolveInput(
    args.audio,
    projectDir,
    ...['wav', 'mp3', 'm4a', 'aac', 'mp4'].map((ext) => join('public', `voiceover-edited.${ext}`)),
  );
  if (!audio) {
    console.error(red('找不到旁白音檔 public/voiceover-edited.*。'));
    console.error(grey('對嘴要以 edited 檔為基準——那是整支片的時間軸來源，不是 raw。'));
    process.exit(1);
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.error(red(`.env 或環境變數找不到 ${API_KEY_ENV}。`));
    process.exit(1);
  }

  const requested = mode === 'ab' ? ['veed/lipsync', 'veed/lipsync/v2'] : [args.model ?? DEFAULT_MODEL];
  for (const id of requested) {
    if (!MODELS[id]) {
      console.error(red(`未知的模型 ${id}。可用：${Object.keys(MODELS).join('、')}`));
      process.exit(1);
    }
  }

  const outDir = join(projectDir, 'public', 'avatar');
  mkdirSync(outDir, { recursive: true });
  // 中間檔不能放在 public/ 底下——Remotion 會把整個 public/ 打包進每次渲染。
  const workDir = join(projectDir, '.lipsync-work');
  mkdirSync(workDir, { recursive: true });

  heading(`對嘴頭像 · ${project}`);
  console.log(grey(`素材 ${rel(source)}`));
  console.log(grey(`旁白 ${rel(audio)}`));

  // 試跑只需要開頭幾秒的旁白；--segment 從 --from 起算只取該視窗；--full 用整條。
  const fullAudioSec = probeDuration(audio);
  const fromSec = mode === 'segment' ? Math.max(0, Number(args.from) || 0) : 0;
  if (fromSec >= fullAudioSec) {
    console.error(red(`--from ${fromSec} 超出旁白長度 ${fullAudioSec.toFixed(1)} 秒。`));
    process.exit(1);
  }
  const wantSec = mode === 'full' ? fullAudioSec : Math.min(Number(args.seconds) || 10, fullAudioSec - fromSec);
  const clipAudio = mode === 'full' ? audio : trimAudio(audio, fromSec, wantSec, workDir);

  // 模型要求影片不短於音檔。素材不夠長就正反接（ping-pong）再重複，接點才不會跳動。
  // 預設不縮：對嘴模型要先在畫面裡找到人臉再重繪嘴部，輸入壓小會直接害到它的判斷。
  // 頭像最終只佔畫面 15–20%，但那是「輸出顯示尺寸」，不是「模型看到的解析度」。
  const height = Number(args.height) || 0;
  const clipVideo = buildSource(source, wantSec, height, workDir);

  console.log(grey(`對嘴長度 ${wantSec.toFixed(1)} 秒`) + (mode === 'full' ? '' : grey(`（完整旁白 ${fullAudioSec.toFixed(1)} 秒）`)));

  const estimates = requested.map((id) => [id, MODELS[id].note, `$${(MODELS[id].usdPerSecond * wantSec).toFixed(2)}`]);
  console.log('');
  table(estimates, ['模型', '單價', '本次估算']);
  console.log(grey('估算值，實際帳單以 fal dashboard 為準。'));
  console.log('');

  // 同一份輸入餵給每個模型，只上傳一次。
  const videoUrl = await upload(apiKey, clipVideo, 'video/mp4');
  const audioUrl = await upload(apiKey, clipAudio, 'audio/wav');

  const results = [];
  for (const model of requested) {
    const label = model.replace(/\//g, '-');
    const suffix =
      mode === 'full'
        ? 'avatar-talking'
        : mode === 'segment'
          ? `avatar-${args.label ?? 'segment'}`
          : `avatar-${mode}-${label}`;
    const dest = join(outDir, `${suffix}.mp4`);
    console.log(bold(`▸ ${model}`));
    const out = await lipsync(apiKey, model, { video_url: videoUrl, audio_url: audioUrl });
    await download(out.url, dest);
    console.log(`  ${green('✔')} ${rel(dest)}  ${grey(`（${(statSync(dest).size / 1e6).toFixed(1)} MB）`)}`);
    results.push({ model, output: rel(dest), seconds: Number(wantSec.toFixed(2)), estimatedUsd: Number((MODELS[model].usdPerSecond * wantSec).toFixed(4)), remoteUrl: out.url });
  }

  const record = { project, mode, from: fromSec, source: rel(source), audio: rel(audio), height, runs: results };
  const recordPath = join(outDir, 'lipsync-runs.json');
  const history = existsSync(recordPath) ? JSON.parse(readFileSync(recordPath, 'utf8')) : [];
  history.push(record);
  writeFileSync(recordPath, JSON.stringify(history, null, 2) + '\n');

  if (args.json) console.log(JSON.stringify(record, null, 2));

  console.log('');
  if (mode === 'full') {
    console.log(grey(`接著：把 ${rel(join(outDir, 'avatar-talking.mp4'))} 當懸浮頭像掛進 Remotion（畫面軌 → 頭像 → 吉祥物 → 字幕）。`));
    console.log(grey(`然後跑：video-flow done ${project} avatar-lipsync --approved-by "<誰確認的>"`));
  } else if (mode === 'segment') {
    console.log(grey('視窗片段已生成。頭像不常駐時就用這個模式按需逐段生成，'));
    console.log(grey('把輸出檔對上 Remotion 端的 avatar 視窗設定（起迄毫秒與檔名一致）即可。'));
  } else {
    console.log(yellow('請在頭像實際尺寸（畫面 15–20% 的圓形）下檢查，不要放大全螢幕看：'));
    console.log(grey('  1. 中文口型對得準不準（唇齒音、閉口音最容易破）'));
    console.log(grey('  2. 嘴部邊緣有沒有糊掉或色差'));
    console.log(grey('  3. 縮到頭像圈之後，上述瑕疵還看不看得出來'));
    if (mode === 'ab') console.log(grey('  兩支並排比：若 v1 在頭像尺寸下看不出差，就用 v1——那是 10 倍價差。'));
  }
}

/** 依序試：明確指定的路徑（絕對／專案內／repo 根），否則依序試專案內的預設位置。 */
function resolveInput(given, projectDir, ...fallbackRels) {
  const candidates = given
    ? [isAbsolute(given) ? given : null, join(projectDir, given), join(REPO_ROOT, given)].filter(Boolean)
    : fallbackRels.map((r) => join(projectDir, r));
  return candidates.find((p) => existsSync(p)) ?? null;
}

function trimAudio(audio, fromSec, seconds, workDir) {
  const out = join(workDir, 'audio-clip.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(fromSec), '-i', audio, '-t', String(seconds), '-ar', '48000', '-ac', '1', out]);
  return out;
}

/**
 * 產出一支「至少和音檔一樣長」的無聲素材影片。
 * 素材比目標短時正反接成一個循環單元再重複——單向重複會在每一圈接點上跳一下。
 */
function buildSource(source, seconds, height, workDir) {
  const srcSec = probeDuration(source);
  const target = seconds + 0.5; // 留半秒尾巴，避免最後一格對不上
  const scale = height > 0 ? ['-vf', `scale=-2:${height}`] : [];

  if (srcSec >= target) {
    const out = join(workDir, 'video-clip.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', source, '-t', String(target), '-an', ...scale, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', out]);
    return out;
  }

  console.log(grey(`素材 ${srcSec.toFixed(1)} 秒短於旁白，正反接後重複到 ${target.toFixed(1)} 秒`));
  const fwd = join(workDir, 'unit-fwd.mp4');
  const rev = join(workDir, 'unit-rev.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', source, '-an', ...scale, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', fwd]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', fwd, '-vf', 'reverse', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', rev]);

  const unit = join(workDir, 'unit.mp4');
  const list = join(workDir, 'concat.txt');
  writeFileSync(list, `file '${fwd}'\nfile '${rev}'\n`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', unit]);

  const loops = Math.ceil(target / (srcSec * 2));
  const out = join(workDir, 'video-clip.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-stream_loop', String(loops), '-i', unit, '-t', String(target), '-an', '-c', 'copy', out]);
  return out;
}

/** fal storage：先 initiate 換一組簽名 URL，再 PUT 位元組上去，回傳公開可讀的 file_url。 */
async function upload(apiKey, file, contentType) {
  const name = file.split('/').pop();
  const initiate = await fetch(INITIATE_URL, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content_type: contentType, file_name: name }),
  });
  if (!initiate.ok) throw new Error(`fal 上傳初始化失敗（${initiate.status}）：${(await initiate.text()).slice(0, 300)}`);
  const { file_url, upload_url } = await initiate.json();

  const put = await fetch(upload_url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: readFileSync(file) });
  if (!put.ok) throw new Error(`fal 上傳失敗（${put.status}）：${(await put.text()).slice(0, 300)}`);
  console.log(grey(`  ↑ ${name}（${(statSync(file).size / 1e6).toFixed(1)} MB）`));
  return file_url;
}

/** 送進 queue，輪詢到結束，回傳輸出影片。 */
async function lipsync(apiKey, model, input) {
  const auth = { Authorization: `Key ${apiKey}` };
  const submit = await fetch(`${QUEUE_BASE}/${model}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!submit.ok) throw new Error(`送出失敗（${submit.status}）：${(await submit.text()).slice(0, 300)}`);
  const queued = await submit.json();
  console.log(grey(`  request ${queued.request_id}`));

  const statusUrl = queued.status_url ?? `${QUEUE_BASE}/${model}/requests/${queued.request_id}/status`;
  const responseUrl = queued.response_url ?? `${QUEUE_BASE}/${model}/requests/${queued.request_id}`;

  let last = '';
  for (let i = 0; i < 600; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(statusUrl, { headers: auth });
    if (!res.ok) throw new Error(`查詢狀態失敗（${res.status}）：${(await res.text()).slice(0, 300)}`);
    const { status } = await res.json();
    if (status !== last) {
      console.log(grey(`  ${status}`));
      last = status;
    }
    if (status === 'COMPLETED') break;
    if (status === 'FAILED' || status === 'CANCELLED') throw new Error(`任務 ${status}`);
    if (i === 599) throw new Error('輪詢逾時（20 分鐘）');
  }

  const res = await fetch(responseUrl, { headers: auth });
  if (!res.ok) throw new Error(`取結果失敗（${res.status}）：${(await res.text()).slice(0, 300)}`);
  const payload = await res.json();
  const url = findVideoUrl(payload);
  if (!url) throw new Error(`回應裡找不到輸出影片：${JSON.stringify(payload).slice(0, 300)}`);
  return { url, payload };
}

/** 模型間的輸出欄位名不保證一致，所以直接往下找第一個像影片的 url。 */
function findVideoUrl(node) {
  if (!node || typeof node !== 'object') return null;
  if (typeof node.url === 'string' && /^https?:/.test(node.url)) return node.url;
  for (const v of Object.values(node)) {
    const found = findVideoUrl(v);
    if (found) return found;
  }
  return null;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下載失敗（${res.status}）：${url}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function resolveApiKey() {
  if (process.env[API_KEY_ENV]) return process.env[API_KEY_ENV];
  const envPath = join(REPO_ROOT, '.env');
  if (!existsSync(envPath)) return null;
  const m = readFileSync(envPath, 'utf8').match(new RegExp(`^\\s*${API_KEY_ENV}\\s*=\\s*(.+)\\s*$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

function probeDuration(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  const n = Number(String(out).trim());
  if (!Number.isFinite(n)) throw new Error(`讀不到長度：${file}`);
  return n;
}

const rel = (p) => resolve(p).replace(REPO_ROOT + '/', '');
