import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const useColour = stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code) => (s) => (useColour ? `\x1b[${code}m${s}\x1b[0m` : s);

export const bold = wrap('1');
export const dim = wrap('2');
export const red = wrap('31');
export const green = wrap('32');
export const yellow = wrap('33');
export const blue = wrap('36');
export const grey = wrap('90');

export const STATUS_LABEL = {
  required: green('必要'),
  locked: blue('鎖定'),
  optional: yellow('選用'),
  skip: grey('不需要'),
};

export const STATUS_MARK = {
  required: green('●'),
  locked: blue('◆'),
  optional: yellow('○'),
  skip: grey('·'),
};

export function heading(text) {
  console.log(`\n${bold(text)}`);
  console.log(grey('─'.repeat(Math.max(12, displayWidth(text)))));
}

/** CJK-aware width so tables line up in a terminal. */
export function displayWidth(str) {
  let w = 0;
  for (const ch of String(str)) {
    const code = ch.codePointAt(0);
    const wide =
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6);
    w += wide ? 2 : 1;
  }
  return w;
}

export function pad(str, width) {
  const s = String(str);
  return s + ' '.repeat(Math.max(0, width - displayWidth(s)));
}

export function table(rows, headers) {
  const all = headers ? [headers, ...rows] : rows;
  const cols = all[0]?.length ?? 0;
  const widths = Array.from({ length: cols }, (_, i) =>
    Math.max(...all.map((r) => displayWidth(stripAnsi(r[i] ?? '')))),
  );
  const render = (r) => r.map((c, i) => padAnsi(c ?? '', widths[i])).join('  ');
  if (headers) {
    console.log(bold(render(headers)));
    console.log(grey(widths.map((w) => '─'.repeat(w)).join('  ')));
  }
  rows.forEach((r) => console.log(render(r)));
}

const ANSI = /\x1b\[[0-9;]*m/g;
export const stripAnsi = (s) => String(s).replace(ANSI, '');
function padAnsi(str, width) {
  const visible = displayWidth(stripAnsi(str));
  return str + ' '.repeat(Math.max(0, width - visible));
}

export function wrapText(text, width, indent = '') {
  const words = String(text).split(/(?<=[，。、；：！？,.])|\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (displayWidth(line + w) > width && line) {
      lines.push(line);
      line = w;
    } else {
      line += w;
    }
  }
  if (line) lines.push(line);
  return lines.map((l, i) => (i === 0 ? l : indent + l)).join('\n' + '');
}

/**
 * Non-TTY stdin (a pipe or heredoc) delivers every line at once and readline drops
 * the ones with no pending question, so buffer them up front and serve from the queue.
 */
async function drainStdin() {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').split('\n');
}

export async function createPrompter() {
  if (!stdin.isTTY) {
    const queue = await drainStdin();
    const next = () => (queue.length ? queue.shift().trim() : null);
    return {
      async text(question, { defaultValue, validate } = {}) {
        const raw = next();
        const value = raw || defaultValue || '';
        console.log(`${bold('?')} ${question} ${green(value)}`);
        if (!value) throw new Error(`stdin 沒有提供「${question}」的答案`);
        if (validate && !new RegExp(validate).test(value)) {
          throw new Error(`「${value}」不符合格式 ${validate}`);
        }
        return value;
      },
      async choose(question, options, { note } = {}) {
        console.log(`\n${bold('?')} ${question}`);
        if (note) console.log(grey(`  ${note}`));
        options.forEach((o, i) => console.log(`  ${i + 1}. ${o.label}`));
        const raw = next();
        const idx = Number(raw) - 1;
        if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
          throw new Error(`「${raw}」不是 1-${options.length} 的有效選項（${question}）`);
        }
        console.log(`  ${green('→ ' + options[idx].label)}`);
        return options[idx];
      },
      close: () => {},
    };
  }

  const rl = createInterface({ input: stdin, output: stdout });
  return {
    async text(question, { defaultValue, validate } = {}) {
      for (;;) {
        const suffix = defaultValue ? grey(` [${defaultValue}]`) : '';
        const answer = (await rl.question(`${bold('?')} ${question}${suffix} `)).trim();
        const value = answer || defaultValue || '';
        if (!value) {
          console.log(red('  這一題不能留空。'));
          continue;
        }
        if (validate && !new RegExp(validate).test(value)) {
          console.log(red(`  格式不符：需符合 ${validate}`));
          continue;
        }
        return value;
      }
    },
    async choose(question, options, { note } = {}) {
      console.log(`\n${bold('?')} ${question}`);
      if (note) console.log(grey(`  ${note}`));
      options.forEach((o, i) => {
        console.log(`  ${bold(String(i + 1))}. ${o.label}`);
        if (o.hint) console.log(grey(`     ${o.hint}`));
      });
      for (;;) {
        const answer = (await rl.question(`  選擇 1-${options.length}: `)).trim();
        const idx = Number(answer) - 1;
        if (Number.isInteger(idx) && idx >= 0 && idx < options.length) return options[idx];
        console.log(red(`  請輸入 1 到 ${options.length} 之間的數字。`));
      }
    },
    close: () => rl.close(),
  };
}
