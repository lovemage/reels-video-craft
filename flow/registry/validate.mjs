import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { stages, methods, questions, REPO_ROOT } from '../cli/lib/registry.mjs';

const STATUSES = new Set(['required', 'optional', 'locked', 'skip']);
const GATES = new Set(['human', 'agent', 'none']);
const TRACKS = new Set(['code', 'generated', 'footage']);
const COST_MODELS = new Set(['none', 'per-second', 'per-image', 'per-asset', 'per-clip']);

/**
 * Hand-rolled schema validation. A JSON Schema library would be one more dependency
 * for a check that only ever runs against three files we control; the point is to
 * catch registry mistakes (a method missing a stage, a dangling guide path) before
 * they reach the CLI as confusing runtime behaviour.
 */
export function validateRegistry() {
  const errors = [];
  const err = (path, msg) => errors.push(`${path}: ${msg}`);

  const st = stages();
  const reg = methods();
  const qs = questions();

  // --- stages ---
  const phaseIds = new Set(st.phases.map((p) => p.id));
  const stageIds = new Set();
  for (const [i, s] of st.stages.entries()) {
    const at = `stages[${i}]${s.id ? ` (${s.id})` : ''}`;
    if (!s.id) err(at, '缺 id');
    if (stageIds.has(s.id)) err(at, `id 重複`);
    stageIds.add(s.id);
    if (!phaseIds.has(s.phase)) err(at, `phase「${s.phase}」不在 phases 清單`);
    if (!localised(s.name)) err(at, 'name 必須是 {zh-TW,...}');
    if (!localised(s.summary)) err(at, 'summary 必須是 {zh-TW,...}');
    if (!GATES.has(s.gate)) err(at, `gate「${s.gate}」無效`);
  }

  // --- shared vocabularies ---
  const inputIds = new Set(reg.inputTypes.map((i) => i.id));
  const aspectIds = new Set(reg.aspects.map((a) => a.id));
  for (const [i, a] of reg.aspects.entries()) {
    if (a.requiresDimensions) continue;
    if (a.size !== 'follow-source' && !/^\d+x\d+$/.test(a.size)) {
      err(`aspects[${i}] (${a.id})`, `size「${a.size}」不是 WxH`);
    }
  }

  // --- methods ---
  const codes = new Set();
  const ids = new Set();
  for (const [i, m] of reg.methods.entries()) {
    const at = `methods[${i}]${m.code ? ` (${m.code})` : ''}`;
    if (!m.id) err(at, '缺 id');
    if (ids.has(m.id)) err(at, 'id 重複');
    if (codes.has(m.code)) err(at, 'code 重複');
    ids.add(m.id);
    codes.add(m.code);
    if (!localised(m.name)) err(at, 'name 必須是 {zh-TW,...}');
    if (!localised(m.tagline)) err(at, 'tagline 必須是 {zh-TW,...}');
    if (!TRACKS.has(m.visualTrack)) err(at, `visualTrack「${m.visualTrack}」無效`);
    if (!COST_MODELS.has(m.cost?.model)) err(at, `cost.model「${m.cost?.model}」無效`);

    for (const inp of m.inputs?.accepts ?? []) {
      if (!inputIds.has(inp)) err(at, `inputs.accepts 有未知輸入「${inp}」`);
    }
    if (!m.inputs?.accepts?.length) err(at, 'inputs.accepts 不可為空');

    for (const a of m.aspects?.supported ?? []) {
      if (!aspectIds.has(a)) err(at, `aspects.supported 有未知比例「${a}」`);
    }
    if (!m.aspects?.supported?.length) err(at, 'aspects.supported 不可為空');
    if (!m.aspects.supported.includes(m.aspects.default)) {
      err(at, `aspects.default「${m.aspects.default}」不在 supported 內`);
    }
    // Only code-drawn visuals can honour an arbitrary canvas.
    if (m.aspects.supported.includes('custom') && m.visualTrack !== 'code') {
      err(at, 'custom 尺寸只有 visualTrack=code 的方式能支援');
    }

    // Every method must take a position on every stage — silence would become
    // an implicit "optional" and hide a real decision.
    for (const sid of stageIds) {
      if (!(sid in (m.stages ?? {}))) err(at, `stages 缺少「${sid}」`);
      else if (!STATUSES.has(m.stages[sid])) err(at, `stages.${sid}「${m.stages[sid]}」無效`);
    }
    for (const sid of Object.keys(m.stages ?? {})) {
      if (!stageIds.has(sid)) err(at, `stages 有未知階段「${sid}」`);
    }

    for (const [sid, ov] of Object.entries(m.stageOverrides ?? {})) {
      if (!stageIds.has(sid)) err(at, `stageOverrides 有未知階段「${sid}」`);
      if (m.stages[sid] === 'skip' && (ov.outputs || ov.name)) {
        err(at, `stageOverrides.${sid} 覆寫了一個 skip 的階段`);
      }
      if (ov.note && !localised(ov.note)) err(at, `stageOverrides.${sid}.note 必須是 {zh-TW,...}`);
      if (ov.rules && !Array.isArray(ov.rules['zh-TW'])) {
        err(at, `stageOverrides.${sid}.rules['zh-TW'] 必須是陣列`);
      }
    }

    if (m.guide && !existsSync(join(REPO_ROOT, m.guide))) {
      err(at, `guide 檔案不存在：${m.guide}`);
    }

    if (m.qaArtifacts) {
      if (!['required', 'optional'].includes(m.qaArtifacts.stills)) {
        err(at, `qaArtifacts.stills「${m.qaArtifacts.stills}」無效`);
      }
      if (!Number.isInteger(m.qaArtifacts.count) || m.qaArtifacts.count < 1) {
        err(at, 'qaArtifacts.count 必須是正整數');
      }
    }
  }

  // --- questions ---
  const orders = new Set();
  for (const [i, q] of qs.questions.entries()) {
    const at = `questions[${i}] (${q.id})`;
    if (orders.has(q.order)) err(at, `order ${q.order} 重複`);
    orders.add(q.order);
    if (!['text', 'single'].includes(q.type)) err(at, `type「${q.type}」無效`);
    if (q.type === 'single' && !q.options && !q.optionsFrom) {
      err(at, 'single 題必須有 options 或 optionsFrom');
    }
    if (q.optionsFrom && !['inputTypes', 'aspects', 'methods'].includes(q.optionsFrom)) {
      err(at, `optionsFrom「${q.optionsFrom}」無效`);
    }
    if (q.skipIf?.stageSkipped && !stageIds.has(q.skipIf.stageSkipped)) {
      err(at, `skipIf.stageSkipped 指向未知階段「${q.skipIf.stageSkipped}」`);
    }
  }

  return errors;
}

function localised(v) {
  return Boolean(v && typeof v === 'object' && typeof v['zh-TW'] === 'string');
}
