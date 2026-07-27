#!/usr/bin/env node
import { bold, grey, heading } from './lib/ui.mjs';

const COMMANDS = {
  intake: { desc: '逐題確認需求，產出 brief.json', load: () => import('./commands/intake.mjs') },
  methods: { desc: '列出製作方式（可用 --input / --aspect 過濾）', load: () => import('./commands/methods.mjs') },
  plan: { desc: '印出某專案／某方式該跑哪些階段、下一步是什麼', load: () => import('./commands/plan.mjs') },
  scaffold: { desc: '依 brief.json 產生該方式的專案骨架', load: () => import('./commands/scaffold.mjs') },
  done: { desc: '標記階段完成（人工關卡需 --approved-by）', load: () => import('./commands/done.mjs') },
  qa: { desc: '對輸出影片跑自動品質檢查', load: () => import('./commands/qa.mjs') },
  doctor: { desc: '檢查工具／env／submodule；--project <name> 改檢查專案本身', load: () => import('./commands/doctor.mjs') },
  docs: { desc: '從 registry 重新生成 docs/WORKFLOWS.md（--check 只驗證）', load: () => import('./commands/docs.mjs') },
  validate: { desc: '驗證 flow/registry/*.json 的結構與交叉引用', load: () => import('./commands/validate.mjs') },
};

const argv = process.argv.slice(2);
const cmd = argv[0];

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
  usage();
  process.exit(cmd ? 0 : 1);
}

if (!COMMANDS[cmd]) {
  console.error(`未知的指令：${cmd}\n`);
  usage();
  process.exit(1);
}

const args = parseArgs(argv.slice(1));
const mod = await COMMANDS[cmd].load();
await mod.run(args);

function parseArgs(rest) {
  const out = { _: [] };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith('--')) {
      const key = camel(a.slice(2));
      const next = rest[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

function camel(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function usage() {
  heading('video-flow — 影片製作流程編排');
  console.log('用法：video-flow <command> [args]\n');
  for (const [name, { desc }] of Object.entries(COMMANDS)) {
    console.log(`  ${bold(name.padEnd(9))} ${desc}`);
  }
  console.log(grey('\n所有指令都支援 --json，供 agent 直接解析。'));
  console.log(grey('流程定義的單一事實來源：flow/registry/*.json'));
}
