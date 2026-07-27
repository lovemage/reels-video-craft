import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { projectsRoot, readBrief, getMethod, t } from '../lib/registry.mjs';
import { commonFiles, programGraphicsFiles } from '../lib/templates.mjs';
import { heading, bold, grey, green, yellow, red } from '../lib/ui.mjs';

/** Method-specific file sets layered on top of the common Remotion skeleton. */
const BUILDERS = {
  'program-graphics': programGraphicsFiles,
};

export function run(args) {
  const project = args._[0];
  if (!project) {
    console.error('用法：video-flow scaffold <project> [--force]');
    process.exit(1);
  }

  const brief = readBrief(project);
  if (!brief) {
    console.error(red(`找不到 production/${project}/brief.json`));
    console.error(grey('先跑 video-flow intake 確認需求，scaffold 才知道要產什麼尺寸與結構。'));
    process.exit(1);
  }

  const method = getMethod(brief.method);
  const projectDir = join(projectsRoot(), project);

  const files = { ...commonFiles(brief), ...(BUILDERS[method.id]?.(brief) ?? {}) };

  heading(`scaffold · ${project}`);
  console.log(`${method.code} ${t(method.name)}　·　${brief.width}×${brief.height} @ ${brief.fps}fps\n`);

  if (!BUILDERS[method.id]) {
    console.log(yellow(`${method.code} 尚無專屬範本，只產生通用 Remotion 骨架。\n`));
  }

  const written = [];
  const skipped = [];
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(projectDir, rel);
    if (existsSync(abs) && !args.force) {
      skipped.push(rel);
      continue;
    }
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    written.push(rel);
  }

  // Directories the pipeline expects even before anything lands in them.
  for (const dir of ['public/captions', 'public/audio', 'out']) {
    mkdirSync(join(projectDir, dir), { recursive: true });
  }

  written.sort().forEach((f) => console.log(`  ${green('+')} ${f}`));
  if (skipped.length) {
    console.log(grey(`\n  已存在、未覆蓋（要覆蓋加 --force）：`));
    skipped.sort().forEach((f) => console.log(grey(`    · ${f}`)));
  }

  console.log(`\n${bold('接著：')}`);
  console.log(grey(`  cd ${projectDir}`));
  console.log(grey('  npm install'));
  console.log(grey(`  video-flow doctor --project ${project}`));
  console.log(grey(`  video-flow plan ${project}`));
}
