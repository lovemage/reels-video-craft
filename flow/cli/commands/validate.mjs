import { validateRegistry } from '../../registry/validate.mjs';
import { heading, green, red, grey } from '../lib/ui.mjs';

export function run(args) {
  const errors = validateRegistry();

  if (args.json) {
    console.log(JSON.stringify({ ok: errors.length === 0, errors }, null, 2));
    if (errors.length) process.exitCode = 1;
    return;
  }

  heading('registry 驗證');
  if (!errors.length) {
    console.log(green('flow/registry/*.json 全部通過。'));
    return;
  }
  console.log(red(`${errors.length} 個問題：\n`));
  errors.forEach((e) => console.log(`  ${red('✗')} ${e}`));
  console.log(grey('\n改完 registry 後記得跑 video-flow docs 重新生成文件。'));
  process.exitCode = 1;
}
