import { methods, filterMethods, t, getInputType, getAspect } from '../lib/registry.mjs';
import { heading, table, grey, bold, green, red, dim } from '../lib/ui.mjs';

export function run(args) {
  const input = args.input;
  const aspect = args.aspect;
  const { eligible, excluded } = filterMethods({ input, aspect });

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          filter: { input: input ?? null, aspect: aspect ?? null },
          eligible: eligible.map(summarise),
          excluded: excluded.map(({ method, reasons }) => ({ ...summarise(method), reasons })),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (input || aspect) {
    const parts = [];
    if (input) parts.push(`輸入＝${t(getInputType(input)?.name) || input}`);
    if (aspect) parts.push(`比例＝${aspect}`);
    console.log(grey(`過濾條件：${parts.join('，')}`));
  }

  heading(`可用製作方式（${eligible.length}/${methods().methods.length}）`);
  table(
    eligible.map((m) => [
      bold(m.code),
      t(m.name),
      m.aspects.supported.join(' '),
      costLabel(m),
      (m.requires.env ?? []).join(' ') || grey('—'),
    ]),
    ['代號', '名稱', '支援比例', '成本', '需要 env'],
  );

  eligible.forEach((m) => {
    console.log(`\n${bold(m.code)} ${bold(t(m.name))}`);
    console.log(`  ${t(m.tagline)}`);
    console.log(grey(`  適合：${(t(m.bestFor) || m.bestFor?.['zh-TW'] || []).join?.('、') ?? ''}`));
  });

  if (excluded.length && !args.eligibleOnly) {
    heading(`已排除（${excluded.length}）`);
    excluded.forEach(({ method, reasons }) => {
      console.log(`${red('✗')} ${bold(method.code)} ${t(method.name)}`);
      reasons.forEach((r) => console.log(grey(`    ${r}`)));
    });
  }
}

function costLabel(m) {
  const map = {
    none: green('無 API 成本'),
    'per-second': '按秒計費',
    'per-image': '按張計費',
    'per-asset': '按素材計費',
    'per-clip': '按鏡頭計費',
  };
  return map[m.cost?.model] ?? m.cost?.model ?? '';
}

function summarise(m) {
  return {
    id: m.id,
    code: m.code,
    name: t(m.name),
    tagline: t(m.tagline),
    inputs: m.inputs.accepts,
    aspects: m.aspects.supported,
    defaultAspect: m.aspects.default,
    cost: m.cost?.model,
    requiresEnv: m.requires.env ?? [],
    visualTrack: m.visualTrack,
  };
}
