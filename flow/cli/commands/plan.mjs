import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { planFor, stageOutputsFor, stages, t, projectsRoot, getMethod } from '../lib/registry.mjs';
import { heading, table, grey, bold, dim, STATUS_MARK, STATUS_LABEL, green, yellow } from '../lib/ui.mjs';

export function run(args) {
  let method = args.method;
  let input = args.input;
  let voice = args.voice;
  let brief = null;

  const project = args._[0];
  if (project) {
    const briefPath = join(projectsRoot(), project, 'brief.json');
    if (!existsSync(briefPath)) {
      console.error(`找不到 ${briefPath}。先跑：video-flow intake`);
      process.exit(1);
    }
    brief = JSON.parse(readFileSync(briefPath, 'utf8'));
    method ??= brief.method;
    input ??= brief.input;
    voice ??= brief.voice ?? undefined;
  }

  if (!method) {
    console.error('用法：video-flow plan <project>  或  video-flow plan --method M4 [--input talking-head-video]');
    process.exit(1);
  }

  const { method: m, plan } = planFor(method, { input, voice });
  const done = new Set(brief?.progress?.completed ?? []);

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          method: { id: m.id, code: m.code, name: t(m.name) },
          input: input ?? null,
          stages: plan.map((p) => ({
            id: p.stage.id,
            phase: p.stage.phase,
            name: t(p.stage.name),
            status: p.status,
            gate: p.stage.gate,
            done: done.has(p.stage.id),
            note: p.note || null,
            precondition: p.precondition || null,
            outputs: stageOutputsFor(p.stage, brief),
            command: p.stage.command ?? null,
            rules: p.stage.rules?.['zh-TW'] ?? [],
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  heading(`${m.code} ${t(m.name)}${project ? grey(`  ·  ${project}`) : ''}`);
  console.log(`${t(m.tagline)}\n`);

  const phases = stages().phases;
  for (const phase of phases) {
    const rows = plan.filter((p) => p.stage.phase === phase.id);
    if (!rows.length) continue;
    const anyActive = rows.some((r) => r.status !== 'skip');
    console.log(bold(`${anyActive ? '' : grey('')}【${t(phase.name)}】`));
    for (const p of rows) {
      const mark = done.has(p.stage.id) ? green('✔') : STATUS_MARK[p.status];
      const gate = p.stage.gate === 'human' && p.status !== 'skip' ? yellow(' ⏸ 需人工確認') : '';
      const name = p.status === 'skip' ? grey(t(p.stage.name)) : t(p.stage.name);
      console.log(`  ${mark} ${name}  ${grey(`[${p.status}]`)}${gate}`);
      if (p.status !== 'skip') {
        if (p.precondition) console.log(yellow(`      前提：${p.precondition}`));
        if (p.note) console.log(grey(`      ${p.note}`));
        if (p.stage.command) console.log(dim(`      $ ${p.stage.command}`));
      } else if (p.note) {
        console.log(grey(`      ${p.note}`));
      }
    }
    console.log('');
  }

  const active = plan.filter((p) => p.status !== 'skip');
  const skipped = plan.filter((p) => p.status === 'skip');
  const nextUp = active.find((p) => !done.has(p.stage.id));

  console.log(grey(`共 ${active.length} 個階段要跑，${skipped.length} 個不需要。`));
  if (nextUp) {
    console.log(`\n${bold('下一步：')}${t(nextUp.stage.name)}`);
    if (nextUp.stage.gate === 'human') {
      console.log(yellow(`  這一關需要使用者確認才能往下走。`));
      const gn = t(nextUp.stage.gateNote);
      if (gn) console.log(grey(`  ${gn}`));
    }
    const rules = nextUp.stage.rules?.['zh-TW'] ?? [];
    rules.forEach((r) => console.log(grey(`  · ${r}`)));
  } else if (brief) {
    console.log(green('\n所有階段已完成。'));
  }
}
