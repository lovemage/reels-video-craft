import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { methods, stages, questions, planFor, t, REPO_ROOT } from '../lib/registry.mjs';
import { green, grey } from '../lib/ui.mjs';

const MARK = { required: '●', locked: '◆', optional: '○', skip: '·' };

export function run(args) {
  const reg = methods();
  const st = stages();
  const out = [];

  out.push('<!-- 這份文件由 `video-flow docs` 從 flow/registry/*.json 生成。不要手改，改 registry。 -->');
  out.push('');
  out.push('# 影片製作流程');
  out.push('');
  out.push(`共 ${reg.methods.length} 套製作方式、${st.stages.length} 個標準階段。沒有預設方式——每個新專案都必須由使用者本次逐題確認。`);
  out.push('');
  out.push('```bash');
  out.push('npx video-flow intake            # 逐題確認 → 產出 brief.json');
  out.push('npx video-flow plan <project>    # 印出這支片該跑哪些階段、下一步是什麼');
  out.push('npx video-flow done <project> <stage> --approved-by "使用者"');
  out.push('npx video-flow qa <project> out/final.mp4');
  out.push('```');
  out.push('');

  // ---- 階段矩陣：使用者問的「哪些要分鏡、哪些要先對齊口播、哪些要先剪片」 ----
  out.push('## 階段矩陣');
  out.push('');
  out.push(`圖例：${MARK.required} 必要　${MARK.locked} 鎖定（由上游技能決定，不可自訂）　${MARK.optional} 選用　${MARK.skip} 不需要`);
  out.push('');
  const codes = reg.methods.map((m) => m.code);
  out.push(`| 階段 | 關卡 | ${codes.join(' | ')} |`);
  out.push(`| --- | --- | ${codes.map(() => ':-:').join(' | ')} |`);
  for (const stage of st.stages) {
    const gate = stage.gate === 'human' ? '⏸ 人工' : '';
    const cells = reg.methods.map((m) => MARK[m.stages[stage.id] ?? 'optional']);
    out.push(`| ${t(stage.name)} | ${gate} | ${cells.join(' | ')} |`);
  }
  out.push('');
  out.push('對照表：');
  out.push('');
  out.push(`| 代號 | 製作方式 |`);
  out.push(`| --- | --- |`);
  reg.methods.forEach((m) => out.push(`| ${m.code} | ${t(m.name)} |`));
  out.push('');

  // ---- 快速判讀 ----
  out.push('### 快速判讀');
  out.push('');
  const need = (stageId, status = 'required') =>
    reg.methods.filter((m) => m.stages[stageId] === status).map((m) => m.code).join('、') || '無';
  const skip = (stageId) =>
    reg.methods.filter((m) => m.stages[stageId] === 'skip').map((m) => m.code).join('、') || '無';
  out.push(`- **需要寫分鏡**：${need('storyboard')}　·　選用：${need('storyboard', 'optional')}　·　不需要：${skip('storyboard')}`);
  out.push(`- **需要先對齊口播時間**：${need('script-align')}　·　不需要：${skip('script-align')}`);
  out.push(`- **需要先剪掉口播多餘段落（auto-editor）**：${need('speech-edit')}　·　不需要：${skip('speech-edit')}`);
  out.push(`- **需要呼叫付費生成 API**：${need('asset-gen')}　·　不需要：${skip('asset-gen')}`);
  out.push(`- **視覺風格由上游技能鎖定、不可自訂**：${need('visual-design', 'locked')}`);
  out.push('');

  // ---- 輸入 × 比例 對照 ----
  out.push('## 輸入素材 × 交付比例');
  out.push('');
  out.push('intake 會用這兩題先篩掉不適用的方式，再讓你選。');
  out.push('');
  out.push(`| 製作方式 | 吃哪些輸入 | 支援比例 | 預設 | 畫面來源 | 成本 |`);
  out.push(`| --- | --- | --- | --- | --- | --- |`);
  const inputName = (id) => t(reg.inputTypes.find((i) => i.id === id)?.name) || id;
  const trackName = { code: '程式繪製', generated: 'AI 生成', footage: '既有影片' };
  const costName = {
    none: '無',
    'per-second': '按秒',
    'per-image': '按張',
    'per-asset': '按素材',
    'per-clip': '按鏡頭',
  };
  for (const m of reg.methods) {
    out.push(
      `| ${m.code} ${t(m.name)} | ${m.inputs.accepts.map(inputName).join('<br>')} | ${m.aspects.supported.join(' ')} | ${m.aspects.default} | ${trackName[m.visualTrack] ?? m.visualTrack} | ${costName[m.cost?.model] ?? '—'} |`,
    );
  }
  out.push('');

  // ---- 階段定義 ----
  out.push('## 階段定義');
  out.push('');
  for (const phase of st.phases) {
    const list = st.stages.filter((s) => s.phase === phase.id);
    if (!list.length) continue;
    out.push(`### ${t(phase.name)}`);
    out.push('');
    for (const s of list) {
      out.push(`#### ${t(s.name)} \`${s.id}\``);
      out.push('');
      out.push(t(s.summary));
      out.push('');
      if (s.gate === 'human') {
        out.push(`> **⏸ 人工確認關卡**${t(s.gateNote) ? `：${t(s.gateNote)}` : ''}`);
        out.push('');
      }
      if (s.inputs?.length) out.push(`- 輸入：${s.inputs.map((x) => `\`${x}\``).join('、')}`);
      if (s.outputs?.length) out.push(`- 產出：${s.outputs.map((x) => `\`${x}\``).join('、')}`);
      if (s.tools?.length) out.push(`- 工具：${s.tools.join('、')}`);
      if (s.command) out.push(`- 指令：\`${s.command}\``);
      for (const r of s.rules?.['zh-TW'] ?? []) out.push(`- 規則：${r}`);
      out.push('');
    }
  }

  // ---- 每套方式細節 ----
  out.push('## 各製作方式');
  out.push('');
  for (const m of reg.methods) {
    const { plan } = planFor(m.id);
    out.push(`### ${m.code} · ${t(m.name)}`);
    out.push('');
    out.push(t(m.tagline));
    out.push('');
    if (m.guide) {
      out.push(`> 長篇實作細節：[\`${m.guide}\`](${m.guide.replace(/^docs\//, '')})`);
      out.push('');
    }
    const list = (v) => (Array.isArray(v?.['zh-TW']) ? v['zh-TW'] : Array.isArray(v) ? v : []);
    if (list(m.bestFor).length) out.push(`**適合**：${list(m.bestFor).join('、')}`);
    if (list(m.strengths).length) out.push(`\n**優點**\n\n${list(m.strengths).map((x) => `- ${x}`).join('\n')}`);
    if (list(m.cautions).length) out.push(`\n**注意**\n\n${list(m.cautions).map((x) => `- ${x}`).join('\n')}`);
    out.push('');
    const req = m.requires;
    const reqParts = [];
    if (req.tools?.length) reqParts.push(`工具 ${req.tools.join('、')}`);
    if (req.env?.length) reqParts.push(`環境變數 ${req.env.join('、')}`);
    if (req.skills?.length) reqParts.push(`skill ${req.skills.join('、')}`);
    if (req.submodules?.length) reqParts.push(`submodule ${req.submodules.join('、')}`);
    if (reqParts.length) out.push(`**需要**：${reqParts.join('　·　')}`);
    if (m.cost?.note) out.push(`\n**成本**：${t(m.cost.note)}`);
    if (m.aspects.note) out.push(`\n**比例**：${t(m.aspects.note)}`);
    if (m.inputs.note) out.push(`\n**輸入**：${t(m.inputs.note)}`);
    out.push('');
    out.push('流程：');
    out.push('');
    for (const p of plan) {
      if (p.status === 'skip') {
        out.push(`- ${MARK.skip} ~~${t(p.stage.name)}~~${p.note ? ` — ${p.note}` : ''}`);
      } else {
        const gate = p.stage.gate === 'human' ? ' ⏸' : '';
        out.push(`- ${MARK[p.status]} **${t(p.stage.name)}**${gate}${p.note ? ` — ${p.note}` : ''}`);
      }
    }
    out.push('');
  }

  // ---- Intake 問答 ----
  const qs = questions();
  out.push('## Intake 問答');
  out.push('');
  qs.rules['zh-TW'].forEach((r) => out.push(`- ${r}`));
  out.push('');
  for (const q of [...qs.questions].sort((a, b) => a.order - b.order)) {
    out.push(`${q.order}. **${t(q.prompt)}** \`${q.id}\``);
    if (q.note) out.push(`   - ${t(q.note)}`);
    if (q.skipIf?.stageSkipped) out.push(`   - 若該方式不跑 \`${q.skipIf.stageSkipped}\` 階段則跳過`);
    for (const o of q.options ?? []) {
      out.push(`   - ${t(o.name)}${t(o.note) ? ` — ${t(o.note)}` : ''}`);
    }
  }
  out.push('');

  const docsDir = join(REPO_ROOT, 'docs');
  mkdirSync(docsDir, { recursive: true });
  const target = join(docsDir, 'WORKFLOWS.md');
  const content = out.join('\n') + '\n';

  if (args.check) {
    const existing = safeRead(target);
    if (existing !== content) {
      console.error('docs/WORKFLOWS.md 與 registry 不同步。跑 `video-flow docs` 重新生成。');
      process.exit(1);
    }
    console.log(green('docs/WORKFLOWS.md 與 registry 同步。'));
    return;
  }

  writeFileSync(target, content);
  console.log(`${green('已生成')} ${target}  ${grey(`(${content.split('\n').length} 行)`)}`);
}

function safeRead(p) {
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}
