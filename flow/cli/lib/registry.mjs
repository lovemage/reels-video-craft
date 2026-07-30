import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const REGISTRY_DIR = resolve(here, '..', '..', 'registry');
export const REPO_ROOT = resolve(here, '..', '..', '..');

const cache = new Map();

function load(name) {
  if (!cache.has(name)) {
    cache.set(name, JSON.parse(readFileSync(join(REGISTRY_DIR, `${name}.json`), 'utf8')));
  }
  return cache.get(name);
}

export const stages = () => load('stages');
export const methods = () => load('methods');
export const questions = () => load('questions');

/** Localised string helper: registry values are either a plain string or {zh-TW, en}. */
export function t(value, lang = 'zh-TW') {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value['zh-TW'] ?? value.en ?? '';
}

/** Localised list helper: {zh-TW: [...]} or a bare array. */
export function tList(value, lang = 'zh-TW') {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value[lang] ?? value['zh-TW'] ?? value.en ?? [];
}

export function getMethod(idOrCode) {
  if (!idOrCode) return null;
  const needle = String(idOrCode).toLowerCase();
  return (
    methods().methods.find((m) => m.id === needle || m.code.toLowerCase() === needle) ?? null
  );
}

export function getStage(id) {
  return stages().stages.find((s) => s.id === id) ?? null;
}

export function getAspect(id) {
  return methods().aspects.find((a) => a.id === id) ?? null;
}

export function getInputType(id) {
  return methods().inputTypes.find((i) => i.id === id) ?? null;
}

/**
 * Filter methods by the answers that drive method selection.
 * Returns {eligible, excluded} so the CLI can explain *why* something was ruled out
 * instead of silently hiding it.
 */
export function filterMethods({ input, aspect } = {}) {
  const eligible = [];
  const excluded = [];
  for (const m of methods().methods) {
    const reasons = [];
    if (input && !m.inputs.accepts.includes(input)) {
      reasons.push(`不吃「${t(getInputType(input)?.name) || input}」這種輸入`);
    }
    if (aspect && aspect !== 'source' && !m.aspects.supported.includes(aspect)) {
      const label = aspect === 'custom' ? '自訂尺寸' : aspect;
      reasons.push(`不支援 ${label}（支援 ${m.aspects.supported.join('、')}）`);
    }
    if (reasons.length) excluded.push({ method: m, reasons });
    else eligible.push(m);
  }
  return { eligible, excluded };
}

const STATUS_ORDER = { required: 0, locked: 1, optional: 2, skip: 3 };

/**
 * Merge a method's stageOverrides onto the shared stage definition.
 * A method may rename a stage, redirect its outputs, or replace its rules — M8's
 * "narration alignment" is really keyword-cue alignment writing programBeats.ts,
 * not a fuzzy match producing segments.ts.
 */
function resolveStage(stage, override) {
  if (!override) return stage;
  return {
    ...stage,
    ...(override.name ? { name: override.name } : {}),
    ...(override.summary ? { summary: override.summary } : {}),
    ...(override.outputs ? { outputs: override.outputs } : {}),
    ...(override.inputs ? { inputs: override.inputs } : {}),
    ...(override.command ? { command: override.command } : {}),
    ...(override.rules ? { rules: override.rules } : {}),
    overridden: Boolean(override.name || override.outputs || override.rules),
  };
}

/**
 * Resolve the concrete stage plan for a method, applying input-type and
 * voice-route adjustments plus method-specific stage overrides.
 *
 * tts-gen is voice-driven, not method-driven: methods that run the speech
 * pipeline declare it "optional", and the confirmed voice answer settles it —
 * tts turns it required and retires speech-edit (synthesised narration has no
 * filler or dead air to cut), human retires tts-gen.
 */
export function planFor(methodIdOrCode, { input, voice } = {}) {
  const method = getMethod(methodIdOrCode);
  if (!method) throw new Error(`未知的製作方式：${methodIdOrCode}`);

  const plan = stages().stages.map((base) => {
    const override = method.stageOverrides?.[base.id];
    const stage = resolveStage(base, override);
    let status = method.stages[base.id] ?? 'optional';
    let note = t(override?.note);
    let precondition = null;

    if (input === 'existing-clip' && ['speech-edit', 'transcribe', 'caption-correct'].includes(base.id)) {
      status = 'skip';
    }
    if (base.id === 'tts-gen' && status !== 'skip') {
      if (voice === 'tts') status = 'required';
      else if (voice) {
        status = 'skip';
        note ||= '不需要——配音使用真人錄音。';
      } else {
        note ||= '是否要跑由配音答案決定：AI TTS 必跑，真人錄音不跑。';
      }
    }
    if (base.id === 'speech-edit' && voice === 'tts' && status !== 'skip') {
      status = 'skip';
      note ||= '不需要——TTS 合成音沒有贅詞與長停頓，voiceover-edited.* 直接由 TTS 輸出衍生。';
    }
    if (
      base.id === 'source-prep' &&
      ['script-text', 'topic-brief'].includes(input) &&
      voice === 'tts' &&
      status !== 'skip'
    ) {
      status = 'skip';
      note ||= '逐字稿已由 intake／series 歸位；voiceover-raw.* 由下一個 tts-gen 階段產生。';
    }
    if (
      ['script-text', 'topic-brief'].includes(input) &&
      ['speech-edit', 'transcribe'].includes(base.id) &&
      status === 'required'
    ) {
      precondition =
        voice === 'tts' && base.id === 'transcribe'
          ? '需先完成 TTS 配音生成，才能執行此階段'
          : '需先依確認的配音方式產生旁白，才能執行此階段';
    }
    if (input === 'voiceover-audio' && base.id === 'source-prep') {
      precondition = '純音檔沒有影片來源，無法做懸浮頭像';
    }

    return { stage, status, note, precondition };
  });

  return { method, plan };
}

export function activeStages(plan) {
  return plan.filter((p) => p.status !== 'skip');
}

/** Resolve outputs whose requirement depends on a confirmed brief answer. */
export function stageOutputsFor(stage, brief) {
  const outputs = [...(stage.outputs ?? [])];
  for (const conditional of stage.conditionalOutputs ?? []) {
    const {field, equals} = conditional.when ?? {};
    if (field && brief?.[field] === equals) outputs.push(...(conditional.outputs ?? []));
  }
  return [...new Set(outputs)];
}

export function statusRank(status) {
  return STATUS_ORDER[status] ?? 9;
}

/** Optional local config (gitignored) for machine-specific paths. */
export function localConfig() {
  const p = join(REPO_ROOT, 'flow.config.json');
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

export function projectsRoot() {
  const cfg = localConfig();
  return resolve(REPO_ROOT, cfg.projectsRoot ?? 'production');
}

/** Root of the upstream content pipeline (topics, master scripts, episodes). */
export function contentRoot() {
  const cfg = localConfig();
  return resolve(REPO_ROOT, cfg.contentRoot ?? 'content');
}

export function readBrief(project) {
  const p = join(projectsRoot(), project, 'brief.json');
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

/** Delivery dimensions for a brief, handling the custom-size case. */
export function briefDimensions(brief) {
  if (!brief) return null;
  if (brief.width && brief.height) return { width: brief.width, height: brief.height };
  const size = brief.aspectSize;
  if (!size || size === 'follow-source' || size === 'custom') return null;
  const [w, h] = String(size).split('x').map(Number);
  return Number.isFinite(w) && Number.isFinite(h) ? { width: w, height: h } : null;
}
