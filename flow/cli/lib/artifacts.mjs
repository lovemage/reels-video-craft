import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

/**
 * Minimal glob: `*` matches within one path segment, `**` matches across segments.
 * Enough for the output patterns the registry declares (`out/*.mp4`,
 * `public/voiceover-edited.*`, `src/modules/**`), with no dependency.
 */
export function matches(root, pattern) {
  const clean = pattern.replace(/\/+$/, '');
  if (!clean.includes('*')) {
    const p = join(root, clean);
    return existsSync(p) ? [clean] : [];
  }

  const segments = clean.split('/');
  const found = [];

  const walk = (dir, rel, idx) => {
    if (idx >= segments.length) {
      if (rel) found.push(rel);
      return;
    }
    const seg = segments[idx];
    const abs = join(root, dir);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) return;

    if (seg === '**') {
      // `**` may consume zero or more segments
      walk(dir, rel, idx + 1);
      for (const entry of readdirSync(abs)) {
        const next = dir ? `${dir}/${entry}` : entry;
        if (statSync(join(root, next)).isDirectory()) walk(next, next, idx);
      }
      return;
    }

    const re = segToRegExp(seg);
    for (const entry of readdirSync(abs)) {
      if (!re.test(entry)) continue;
      const next = dir ? `${dir}/${entry}` : entry;
      const isLast = idx === segments.length - 1;
      if (isLast) found.push(next);
      else if (statSync(join(root, next)).isDirectory()) walk(next, next, idx + 1);
    }
  };

  walk('', '', 0);
  return found;
}

function segToRegExp(seg) {
  const escaped = seg.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`);
}

/**
 * Verify a stage's declared outputs exist. Patterns pointing into brief.json
 * (`brief.json#timeline`) check that the field is actually populated rather than
 * merely present, since an empty scaffold would otherwise pass.
 */
export function verifyOutputs(projectDir, outputs = [], brief = null) {
  const results = [];
  for (const pattern of outputs) {
    if (pattern.startsWith('brief.json#')) {
      const field = pattern.slice('brief.json#'.length);
      const value = brief?.[field];
      const populated =
        value != null &&
        (typeof value !== 'object' || Object.values(value).some((v) => v != null));
      results.push({ pattern, ok: populated, found: populated ? [`brief.json → ${field}`] : [] });
      continue;
    }
    const found = matches(projectDir, pattern);
    results.push({ pattern, ok: found.length > 0, found });
  }
  return results;
}
