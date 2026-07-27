import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { methods, getMethod, t, REPO_ROOT, readBrief, projectsRoot, planFor } from '../lib/registry.mjs';
import { verifyOutputs } from '../lib/artifacts.mjs';
import { heading, table, grey, green, red, yellow, bold } from '../lib/ui.mjs';

const TOOL_CHECKS = {
  'node>=22': () => {
    const major = Number(process.versions.node.split('.')[0]);
    return { ok: major >= 22, detail: `v${process.versions.node}` };
  },
  ffmpeg: () => bin('ffmpeg', ['-version']),
  ffprobe: () => bin('ffprobe', ['-version']),
  'auto-editor': () => bin('auto-editor', ['--version']),
  python3: () => bin('python3', ['--version']),
  whisper: () => ({ ok: null, detail: '由專案內 @remotion/install-whisper-cpp 或外部 whisper 提供' }),
  hyperframes: () => bin('hyperframes', ['--version']),
};

export function run(args) {
  if (args.project) return projectDoctor(args);

  const target = args.method ? [getMethod(args.method)] : methods().methods;
  if (args.method && !target[0]) {
    console.error(`未知的製作方式：${args.method}`);
    process.exit(1);
  }

  const toolResults = new Map();
  const needTool = (name) => {
    if (!toolResults.has(name)) {
      const fn = TOOL_CHECKS[name] ?? (() => bin(name, ['--version']));
      toolResults.set(name, fn());
    }
    return toolResults.get(name);
  };

  const envFile = readEnv();
  const envHas = (k) => Boolean(process.env[k] || envFile[k]);

  const rows = [];
  for (const m of target) {
    const problems = [];
    for (const tool of m.requires.tools ?? []) {
      const r = needTool(tool);
      if (r.ok === false) problems.push(`缺 ${tool}`);
    }
    for (const key of m.requires.env ?? []) {
      if (!envHas(key)) problems.push(`.env 缺 ${key}`);
    }
    for (const sub of m.requires.submodules ?? []) {
      const p = join(REPO_ROOT, sub);
      const empty = !existsSync(p) || readdirSync(p).length === 0;
      if (empty) problems.push(`submodule 未初始化：${sub}`);
    }
    rows.push({ method: m, problems });
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          tools: Object.fromEntries([...toolResults].map(([k, v]) => [k, v])),
          methods: rows.map(({ method, problems }) => ({
            id: method.id,
            code: method.code,
            ready: problems.length === 0,
            problems,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  heading('工具');
  table(
    [...toolResults].map(([name, r]) => [
      r.ok === null ? yellow('－') : r.ok ? green('✔') : red('✗'),
      name,
      grey(r.detail ?? ''),
    ]),
  );

  heading('製作方式可用性');
  for (const { method: m, problems } of rows) {
    if (!problems.length) {
      console.log(`${green('✔')} ${bold(m.code)} ${t(m.name)}`);
    } else {
      console.log(`${red('✗')} ${bold(m.code)} ${t(m.name)}`);
      problems.forEach((p) => console.log(grey(`    ${p}`)));
    }
  }
  const ready = rows.filter((r) => !r.problems.length).length;
  console.log(grey(`\n${ready}/${rows.length} 套方式目前可直接執行。`));
}

/**
 * Machine-level checks say "M8 is runnable"; that's not the same as "this project
 * can render". This checks the project itself: brief, deps installed, the files the
 * chosen method's stages actually declare.
 */
function projectDoctor(args) {
  const project = args.project === true ? args._[0] : args.project;
  const brief = readBrief(project);
  if (!brief) {
    console.error(red(`找不到 production/${project}/brief.json`));
    process.exit(1);
  }
  const dir = join(projectsRoot(), project);
  const method = getMethod(brief.method);
  const { plan } = planFor(brief.method, { input: brief.input });
  const checks = [];
  const add = (name, ok, detail, hint) => checks.push({ name, ok, detail, hint });

  // Delivery spec
  const evenDims = brief.width % 2 === 0 && brief.height % 2 === 0;
  add('交付尺寸已定義', Boolean(brief.width && brief.height), `${brief.width}×${brief.height}`);
  add('H.264 偶數尺寸', evenDims, evenDims ? 'ok' : '奇數尺寸會導致渲染失敗', '重跑 intake --force 改尺寸');

  // Node project
  const pkgPath = join(dir, 'package.json');
  const hasPkg = existsSync(pkgPath);
  add('package.json', hasPkg, hasPkg ? '' : '尚未 scaffold', `video-flow scaffold ${project}`);

  if (hasPkg) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    add('remotion 依賴已宣告', Boolean(deps.remotion), deps.remotion ?? '缺 remotion');
    const nm = join(dir, 'node_modules');
    const installed = existsSync(nm) && existsSync(join(nm, 'remotion'));
    add('依賴已安裝', installed, installed ? '' : 'node_modules 不完整', `cd ${dir} && npm install`);
    add('render script', Boolean(pkg.scripts?.render), pkg.scripts?.render ?? '未定義');
    add('lint script', Boolean(pkg.scripts?.lint), pkg.scripts?.lint ?? '未定義');
  }

  // Composition profile must drive layout, not hard-coded numbers
  if (method.id === 'program-graphics') {
    const profile = join(dir, 'src/layout/compositionProfiles.ts');
    const hasProfile = existsSync(profile);
    add('composition profile', hasProfile, hasProfile ? '' : '缺 src/layout/compositionProfiles.ts');
    if (hasProfile) {
      const src = readFileSync(profile, 'utf8');
      const matchW = /width:\s*(\d+)/.exec(src);
      const matchH = /height:\s*(\d+)/.exec(src);
      const consistent =
        matchW && matchH && Number(matchW[1]) === brief.width && Number(matchH[1]) === brief.height;
      add(
        'profile 尺寸與 brief 一致',
        Boolean(consistent),
        consistent ? `${matchW[1]}×${matchH[1]}` : `profile ${matchW?.[1]}×${matchH?.[1]} ≠ brief ${brief.width}×${brief.height}`,
        `video-flow scaffold ${project} --force`,
      );
    }
    const beats = join(dir, 'src/data/programBeats.ts');
    add('programBeats.ts', existsSync(beats), existsSync(beats) ? '' : '缺 beat sheet');
  }

  // Stage outputs that should already exist given recorded progress
  const completed = new Set(brief.progress?.completed ?? []);
  for (const p of plan.filter((s) => s.status !== 'skip' && completed.has(s.stage.id))) {
    const results = verifyOutputs(dir, p.stage.outputs ?? [], brief);
    const missing = results.filter((r) => !r.ok);
    if (missing.length) {
      add(
        `已完成階段「${t(p.stage.name)}」的產物`,
        false,
        `遺失 ${missing.map((m) => m.pattern).join('、')}`,
        '產物被刪除或移動了，重做該階段或修正路徑',
      );
    }
  }

  if (args.json) {
    console.log(JSON.stringify({ project, method: method.code, checks }, null, 2));
    if (checks.some((c) => !c.ok)) process.exitCode = 1;
    return;
  }

  heading(`專案檢查 · ${project}`);
  console.log(grey(`${method.code} ${t(method.name)}　·　${dir}\n`));
  table(checks.map((c) => [c.ok ? green('✔') : red('✗'), c.name, grey(c.detail ?? '')]));
  const failed = checks.filter((c) => !c.ok);
  console.log('');
  if (!failed.length) console.log(green('專案就緒。'));
  else {
    console.log(red(`${failed.length} 項需要處理：`));
    failed.filter((f) => f.hint).forEach((f) => console.log(grey(`  ${f.name} → ${f.hint}`)));
    process.exitCode = 1;
  }
}

function bin(cmd, cmdArgs) {
  try {
    const out = execFileSync(cmd, cmdArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, detail: out.split('\n')[0].slice(0, 60) };
  } catch {
    return { ok: false, detail: '找不到或無法執行' };
  }
}

function readEnv() {
  const p = join(REPO_ROOT, '.env');
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/.exec(line);
    if (m && m[2]) out[m[1]] = true;
  }
  return out;
}
