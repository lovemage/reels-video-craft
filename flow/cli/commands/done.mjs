import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectsRoot, planFor, t } from '../lib/registry.mjs';
import { verifyOutputs } from '../lib/artifacts.mjs';
import { grey, green, red, yellow, bold } from '../lib/ui.mjs';

/**
 * Mark a stage complete. Two things block it:
 *   - a human-gated stage with no --approved-by (an agent must not self-sign)
 *   - declared outputs that don't actually exist on disk
 * Both are overridable with --force, and the override is recorded in brief.json.
 */
export function run(args) {
  const [project, stageId] = args._;
  if (!project || !stageId) {
    console.error('用法：video-flow done <project> <stage-id> [--approved-by "使用者"] [--note "..."]');
    process.exit(1);
  }

  const projectDir = join(projectsRoot(), project);
  const briefPath = join(projectDir, 'brief.json');
  if (!existsSync(briefPath)) {
    console.error(red(`找不到 ${briefPath}`));
    process.exit(1);
  }
  const brief = JSON.parse(readFileSync(briefPath, 'utf8'));

  const { plan } = planFor(brief.method, { input: brief.input });
  const entry = plan.find((p) => p.stage.id === stageId);
  if (!entry) {
    console.error(red(`未知的階段：${stageId}`));
    process.exit(1);
  }
  const stage = entry.stage;
  if (entry.status === 'skip') {
    console.error(red(`${brief.methodCode} 這套方式不跑 ${stageId} 階段，不需要標記完成。`));
    process.exit(1);
  }

  if (stage.gate === 'human' && !args.approvedBy) {
    console.error(red(`「${t(stage.name)}」是人工確認關卡。`));
    const gn = t(stage.gateNote);
    if (gn) console.error(grey(gn));
    console.error(yellow('取得使用者確認後再加上 --approved-by "<誰確認的>"。'));
    process.exit(1);
  }

  // Order matters in this pipeline — a later stage built on an unfinished earlier one
  // is almost always a mistake.
  const completed = new Set(brief.progress?.completed ?? []);
  const active = plan.filter((p) => p.status !== 'skip').map((p) => p.stage.id);
  const idx = active.indexOf(stageId);
  const openEarlier = active.slice(0, idx).filter((id) => !completed.has(id));
  if (openEarlier.length && !args.force) {
    console.error(red(`前面還有未完成的階段：${openEarlier.join('、')}`));
    console.error(grey('確定要跳過請加 --force（會記錄在 brief.json）。'));
    process.exit(1);
  }

  // Verify the stage actually produced what it claims to produce.
  const outputs = stage.outputs ?? [];
  const verified = verifyOutputs(projectDir, outputs, brief);
  const missing = verified.filter((v) => !v.ok);
  if (missing.length && !args.force) {
    console.error(red(`「${t(stage.name)}」宣告的產物不存在：`));
    missing.forEach((v) => console.error(grey(`    ${v.pattern}`)));
    const present = verified.filter((v) => v.ok);
    if (present.length) {
      console.error(grey('  已找到：'));
      present.forEach((v) => console.error(grey(`    ${v.found.join('、')}`)));
    }
    console.error(yellow('  產出檔案後再標記完成，或加 --force 記錄為刻意略過。'));
    process.exit(1);
  }

  brief.progress ??= { completed: [], notes: {} };
  brief.progress.completed ??= [];
  brief.progress.notes ??= {};
  if (!brief.progress.completed.includes(stageId)) brief.progress.completed.push(stageId);
  brief.progress.notes[stageId] = {
    at: new Date().toISOString(),
    approvedBy: args.approvedBy ?? null,
    note: args.note ?? null,
    outputs: verified.filter((v) => v.ok).flatMap((v) => v.found),
    ...(openEarlier.length ? { skippedOver: openEarlier } : {}),
    ...(missing.length ? { missingOutputs: missing.map((v) => v.pattern) } : {}),
  };
  writeFileSync(briefPath, JSON.stringify(brief, null, 2) + '\n');

  console.log(`${green('✔')} ${bold(t(stage.name))} 已標記完成`);
  if (args.approvedBy) console.log(grey(`  確認者：${args.approvedBy}`));
  verified.filter((v) => v.ok).forEach((v) => console.log(grey(`  產物：${v.found.join('、')}`)));
  if (missing.length) {
    console.log(yellow(`  略過檢查的產物：${missing.map((v) => v.pattern).join('、')}`));
  }
  const next = active.find((id) => !brief.progress.completed.includes(id));
  const nextStage = next ? plan.find((p) => p.stage.id === next).stage : null;
  console.log(nextStage ? grey(`  下一步：${t(nextStage.name)} (${next})`) : green('  全部階段完成。'));
}
