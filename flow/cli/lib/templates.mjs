/**
 * Project templates. Every file is a function of the brief, so a scaffolded project
 * already carries this video's real canvas, fps and caption treatment — there is no
 * hard-coded 1080x1920 to find and fix later.
 */

const REMOTION = '4.0.494';

export function commonFiles(brief) {
  const { width, height, fps } = dims(brief);
  return {
    'package.json':
      JSON.stringify(
        {
          name: brief.project,
          version: '1.0.0',
          private: true,
          scripts: {
            dev: 'remotion studio --no-open',
            build: 'remotion bundle',
            lint: 'eslint src && tsc',
            render: `remotion render ${compositionId(brief)} out/${brief.project}-v1.mp4 --codec=h264 --audio-codec=aac`,
          },
          dependencies: {
            '@remotion/captions': REMOTION,
            '@remotion/cli': REMOTION,
            '@remotion/media': REMOTION,
            react: '19.2.3',
            'react-dom': '19.2.3',
            remotion: REMOTION,
          },
          devDependencies: {
            '@remotion/eslint-config-flat': REMOTION,
            '@types/react': '19.2.7',
            eslint: '9.38.0',
            typescript: '5.9.3',
          },
        },
        null,
        2,
      ) + '\n',

    'remotion.config.ts': `import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(false);
`,

    'tsconfig.json':
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            lib: ['ES2022', 'DOM'],
            module: 'ESNext',
            moduleResolution: 'bundler',
            jsx: 'react-jsx',
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            esModuleInterop: true,
          },
          include: ['src'],
        },
        null,
        2,
      ) + '\n',

    'eslint.config.mjs': `import {config} from '@remotion/eslint-config-flat';

export default config;
`,

    'src/index.ts': `import {registerRoot} from 'remotion';
import {RemotionRoot} from './Root';

registerRoot(RemotionRoot);
`,

    'src/index.css': `* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
`,

    '.gitignore': `node_modules/
out/
`,

    'README.md': `# ${brief.project}

由 \`video-flow scaffold\` 產生。製作方式：**${brief.methodCode}**　·　交付：${width}×${height} @ ${fps}fps

流程狀態與需求確認結果在 [\`brief.json\`](brief.json)。

\`\`\`bash
npm install
npm run dev      # Remotion Studio
npm run lint
npm run render
\`\`\`

下一步請跑：

\`\`\`bash
video-flow plan ${brief.project}
\`\`\`
`,
  };
}

/** M8 · Program Graphics — profile-driven layout, beat-driven reveals. */
export function programGraphicsFiles(brief) {
  const { width, height, fps } = dims(brief);
  const aspect = classifyAspect(width, height);

  return {
    'src/layout/compositionProfiles.ts': `export type CompositionProfile = {
  width: number;
  height: number;
  fps: number;
  aspect: 'landscape' | 'portrait' | 'square' | 'custom';
  safeArea: {top: number; right: number; bottom: number; left: number};
  captionZone: {top: number; bottom: number};
};

// 本次交付規格，來自 brief.json。改尺寸只改這裡，元件一律讀 profile。
export const DELIVERY: CompositionProfile = {
  width: ${width},
  height: ${height},
  fps: ${fps},
  aspect: '${aspect}',
  safeArea: {top: ${Math.round(height * 0.06)}, right: ${Math.round(width * 0.06)}, bottom: ${Math.round(height * 0.08)}, left: ${Math.round(width * 0.06)}},
  captionZone: {top: ${Math.round(height * 0.78)}, bottom: ${Math.round(height * 0.94)}},
};

/** 相對單位：以畫布短邊為基準，換比例時比例關係不變。 */
export const unit = (p: CompositionProfile) => Math.min(p.width, p.height) / 100;
`,

    'src/layout/resolveProgramLayout.ts': `import {CompositionProfile, unit} from './compositionProfiles';

export type ProgramLayout = {
  /** 主構圖區：資訊物件都放這裡 */
  stage: {x: number; y: number; width: number; height: number};
  /** 章節／標題帶 */
  header: {x: number; y: number; width: number; height: number};
  /** 場內資訊標籤欄；橫式在右側，直式在下方 */
  rail: {x: number; y: number; width: number; height: number};
  u: number;
};

/**
 * 橫式左右分欄、直式上下分區。共用同一份 beat 資料與動畫邏輯，
 * 只有座標不同——不得以裁切橫式畫面充當直式。
 */
export const resolveProgramLayout = (p: CompositionProfile): ProgramLayout => {
  const u = unit(p);
  const {safeArea: s} = p;
  const innerW = p.width - s.left - s.right;
  const innerH = p.height - s.top - s.bottom;
  const headerH = u * 12;

  if (p.aspect === 'landscape') {
    const railW = innerW * 0.28;
    return {
      u,
      header: {x: s.left, y: s.top, width: innerW, height: headerH},
      stage: {
        x: s.left,
        y: s.top + headerH + u * 3,
        width: innerW - railW - u * 3,
        height: innerH - headerH - u * 3,
      },
      rail: {
        x: s.left + innerW - railW,
        y: s.top + headerH + u * 3,
        width: railW,
        height: innerH - headerH - u * 3,
      },
    };
  }

  const railH = innerH * 0.22;
  return {
    u,
    header: {x: s.left, y: s.top, width: innerW, height: headerH},
    stage: {
      x: s.left,
      y: s.top + headerH + u * 3,
      width: innerW,
      height: innerH - headerH - railH - u * 6,
    },
    rail: {x: s.left, y: s.top + innerH - railH, width: innerW, height: railH},
  };
};
`,

    'src/theme/programTheme.ts': `// 題材化視覺語法。依內容重新定義——「日式節目」指的是資訊編舞方法，
// 不代表要套用和風素材。
export const theme = {
  bg: '#0d1117',
  surface: '#161b22',
  ink: '#f0f6fc',
  inkMuted: '#8b949e',
  accent: '#e3b341',
  accentAlt: '#58a6ff',
  danger: '#f85149',
  rule: 'rgba(240, 246, 252, 0.14)',
  fontDisplay: '"Noto Sans TC", "PingFang TC", system-ui, sans-serif',
  fontBody: '"Noto Sans TC", "PingFang TC", system-ui, sans-serif',
} as const;
`,

    'src/data/programBeats.ts': `import type {Caption} from '@remotion/captions';

/**
 * Beat sheet — 本方式的「分鏡」。
 *
 * revealFrame 由 \`script-align\`（關鍵詞揭示對時）階段填入：
 * 在 captions.json 找到 cue 關鍵詞出現的那一刻，取它的 startMs 換算成影格。
 * 不要平均分配，也不要用外部工具估的秒數。
 */
export type InfoObject = {
  id: string;
  kind: 'label' | 'counter' | 'node' | 'edge' | 'region';
  text: string;
  value?: number;
  /** 相對於 beat revealFrame 的偏移，用來讓同一 beat 內的物件依序出現 */
  offsetFrames?: number;
};

export type ProgramBeat = {
  id: string;
  /** 這句要觀眾理解什麼 */
  understand: string;
  /** 畫面主構圖 */
  composition: 'timeline' | 'relations' | 'map' | 'data' | 'quote' | 'chapter' | 'hook';
  /** 對時用的關鍵詞：人名、年份、地名或數值，必須是旁白真的講出來的字 */
  cue: string;
  /** 由 script-align 階段填入；null 代表還沒對時 */
  revealFrame: number | null;
  /** 這個 beat 結束時的狀態改變 */
  exit?: 'fade' | 'wipe' | 'fill' | 'advance' | 'break' | 'refocus';
  objects: InfoObject[];
};

export const chapters: {id: string; title: string; positioning: string; atFrame: number | null}[] = [
  {id: 'ch1', title: '章節一', positioning: '一句話定位這一段在講什麼', atFrame: null},
];

export const beats: ProgramBeat[] = [
  {
    id: 'b1',
    understand: '（範例）先給觀眾一個衝突或結果，讓他想知道原因',
    composition: 'hook',
    cue: '（旁白裡真的出現的關鍵詞）',
    revealFrame: null,
    exit: 'fade',
    objects: [{id: 'b1-title', kind: 'label', text: '換成你的 Hook'}],
  },
];

/** 尚未對時的 beat；scaffold 剛產生時全部都是。 */
export const unalignedBeats = (all: ProgramBeat[] = beats) =>
  all.filter((b) => b.revealFrame === null);

/**
 * 對時輔助：在字幕裡找 cue 關鍵詞出現的影格。
 * 用單調游標往前搜尋，同一個詞重複出現時依 beat 順序取正確的那一次。
 */
export const alignBeats = (
  all: ProgramBeat[],
  captions: Caption[],
  fps: number,
): ProgramBeat[] => {
  let cursor = 0;
  return all.map((beat) => {
    const idx = captions.findIndex(
      (c, i) => i >= cursor && c.text.includes(beat.cue),
    );
    if (idx === -1) return beat;
    cursor = idx + 1;
    return {...beat, revealFrame: Math.round((captions[idx].startMs / 1000) * fps)};
  });
};
`,

    'src/modules/ProgramIdent.tsx': `import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme/programTheme';
import type {ProgramLayout} from '../layout/resolveProgramLayout';

/** 節目識別。社群短片控制在 0.5–1.5 秒，不能壓過 Hook。 */
export const ProgramIdent: React.FC<{title: string; layout: ProgramLayout}> = ({
  title,
  layout,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 200}});
  const opacity = interpolate(enter, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.bg,
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: theme.fontDisplay,
          fontSize: layout.u * 9,
          fontWeight: 800,
          letterSpacing: layout.u * 0.4,
          color: theme.ink,
          borderBottom: \`\${layout.u * 0.5}px solid \${theme.accent}\`,
          paddingBottom: layout.u * 2,
          transform: \`translateY(\${interpolate(enter, [0, 1], [layout.u * 2, 0])}px)\`,
        }}
      >
        {title}
      </div>
    </div>
  );
};
`,

    'src/modules/ChapterCard.tsx': `import {interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../theme/programTheme';
import type {ProgramLayout} from '../layout/resolveProgramLayout';

export const ChapterCard: React.FC<{
  title: string;
  positioning: string;
  layout: ProgramLayout;
}> = ({title, positioning, layout}) => {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <div style={{position: 'absolute', ...box(layout.header)}}>
      <div
        style={{
          fontFamily: theme.fontDisplay,
          fontSize: layout.u * 5.5,
          fontWeight: 700,
          color: theme.ink,
          clipPath: \`inset(0 \${(1 - wipe) * 100}% 0 0)\`,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: theme.fontBody,
          fontSize: layout.u * 2.4,
          color: theme.inkMuted,
          marginTop: layout.u * 0.8,
          opacity: interpolate(frame, [8, 20], [0, 1], {extrapolateRight: 'clamp'}),
        }}
      >
        {positioning}
      </div>
    </div>
  );
};

const box = (r: {x: number; y: number; width: number; height: number}) => ({
  left: r.x,
  top: r.y,
  width: r.width,
  height: r.height,
});
`,

    'src/modules/DataCounter.tsx': `import {interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../theme/programTheme';
import type {ProgramLayout} from '../layout/resolveProgramLayout';

/** 數字累進：內容本身就是動畫，不加無關的裝飾動態。 */
export const DataCounter: React.FC<{
  label: string;
  value: number;
  suffix?: string;
  durationInFrames?: number;
  layout: ProgramLayout;
}> = ({label, value, suffix = '', durationInFrames = 30, layout}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shown = Math.round(value * progress);

  return (
    <div style={{fontFamily: theme.fontDisplay}}>
      <div style={{fontSize: layout.u * 2.2, color: theme.inkMuted}}>{label}</div>
      <div
        style={{
          fontSize: layout.u * 10,
          fontWeight: 800,
          color: theme.accent,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {shown.toLocaleString()}
        <span style={{fontSize: layout.u * 4, marginLeft: layout.u * 0.6}}>{suffix}</span>
      </div>
    </div>
  );
};
`,

    'src/modules/Timeline.tsx': `import {interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../theme/programTheme';
import type {ProgramLayout} from '../layout/resolveProgramLayout';

/** 年份推進：節點依 revealAt 逐一出現，線段跟著長出來。 */
export const Timeline: React.FC<{
  nodes: {id: string; year: string; label: string; revealAt: number}[];
  layout: ProgramLayout;
}> = ({nodes, layout}) => {
  const frame = useCurrentFrame();
  const last = nodes[nodes.length - 1]?.revealAt ?? 1;
  const grown = interpolate(frame, [0, last], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <div style={{position: 'relative', width: '100%', height: '100%'}}>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          height: layout.u * 0.3,
          width: \`\${grown * 100}%\`,
          background: theme.rule,
        }}
      />
      {nodes.map((n, i) => {
        const appear = interpolate(frame, [n.revealAt, n.revealAt + 8], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={n.id}
            style={{
              position: 'absolute',
              top: '50%',
              left: \`\${(i / Math.max(1, nodes.length - 1)) * 100}%\`,
              transform: 'translate(-50%, -50%)',
              opacity: appear,
              textAlign: 'center',
              fontFamily: theme.fontDisplay,
            }}
          >
            <div
              style={{
                width: layout.u * 1.6,
                height: layout.u * 1.6,
                borderRadius: '50%',
                background: theme.accent,
                margin: '0 auto',
              }}
            />
            <div style={{fontSize: layout.u * 3, color: theme.ink, marginTop: layout.u}}>
              {n.year}
            </div>
            <div style={{fontSize: layout.u * 2, color: theme.inkMuted}}>{n.label}</div>
          </div>
        );
      })}
    </div>
  );
};
`,

    'src/captions/NarrationCaptions.tsx': `import type {Caption} from '@remotion/captions';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme/programTheme';
import type {CompositionProfile} from '../layout/compositionProfiles';

/**
 * 旁白字幕。與章節標題、場內資訊標籤是不同層級——
 * 場內標籤不能取代完整旁白字幕。
 */
export const NarrationCaptions: React.FC<{
  captions: Caption[];
  profile: CompositionProfile;
}> = ({captions, profile}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const active = captions.find((c) => ms >= c.startMs && ms <= c.endMs);
  if (!active) return null;

  const u = Math.min(profile.width, profile.height) / 100;

  return (
    <div
      style={{
        position: 'absolute',
        left: profile.safeArea.left,
        right: profile.safeArea.right,
        top: profile.captionZone.top,
        height: profile.captionZone.bottom - profile.captionZone.top,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontFamily: theme.fontBody,
          fontSize: u * 4,
          fontWeight: 700,
          lineHeight: 1.35,
          color: '#fff',
          textShadow: '0 2px 8px rgba(0,0,0,0.85)',
        }}
      >
        {active.text}
      </span>
    </div>
  );
};
`,

    'src/Composition.tsx': `import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import type {Caption} from '@remotion/captions';
import {DELIVERY} from './layout/compositionProfiles';
import {resolveProgramLayout} from './layout/resolveProgramLayout';
import {theme} from './theme/programTheme';
import {beats, chapters} from './data/programBeats';
import {ProgramIdent} from './modules/ProgramIdent';
import {ChapterCard} from './modules/ChapterCard';
import {NarrationCaptions} from './captions/NarrationCaptions';

import captionsJson from '../public/captions/captions.json';

const captions = captionsJson as Caption[];

export const ${componentName(brief)}: React.FC = () => {
  const layout = resolveProgramLayout(DELIVERY);

  return (
    <AbsoluteFill style={{backgroundColor: theme.bg}}>
      {/* 節目識別 — 控制在 0.5–1.5 秒 */}
      <Sequence durationInFrames={Math.round(DELIVERY.fps * 1.2)}>
        <ProgramIdent title="節目名稱" layout={layout} />
      </Sequence>

      {/* 章節與 beat 揭示：revealFrame 由 script-align 階段填入 */}
      {chapters.map((ch) =>
        ch.atFrame === null ? null : (
          <Sequence key={ch.id} from={ch.atFrame} durationInFrames={Math.round(DELIVERY.fps * 2)}>
            <ChapterCard title={ch.title} positioning={ch.positioning} layout={layout} />
          </Sequence>
        ),
      )}

      {beats.map((beat) =>
        beat.revealFrame === null ? null : (
          <Sequence key={beat.id} from={beat.revealFrame}>
            {/* 依 beat.composition 掛對應模組；每次只新增一個理解步驟 */}
            <AbsoluteFill />
          </Sequence>
        ),
      )}

      <Audio src={staticFile('voiceover-edited.wav')} />
      <NarrationCaptions captions={captions} profile={DELIVERY} />
    </AbsoluteFill>
  );
};
`,

    'src/Root.tsx': `import {Composition} from 'remotion';
import {${componentName(brief)}} from './Composition';
import {DELIVERY} from './layout/compositionProfiles';
import './index.css';

// durationInFrames 由 timeline-lock 階段依 voiceover-edited 的實際長度決定。
const TOTAL_FRAMES = ${fps * 10};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="${compositionId(brief)}"
    component={${componentName(brief)}}
    durationInFrames={TOTAL_FRAMES}
    fps={DELIVERY.fps}
    width={DELIVERY.width}
    height={DELIVERY.height}
  />
);
`,

    'public/captions/captions.json': '[]\n',

    'STORYBOARD.zh-TW.md': `# ${brief.project} · Beat sheet

> 這是 **M8** 的分鏡形式：beat sheet，不是逐鏡分鏡表。
> 正式資料寫在 [\`src/data/programBeats.ts\`](src/data/programBeats.ts)，這份只作為給人看的討論稿。

每個 beat 必須回答五件事：

| # | 這句要觀眾理解什麼 | 主構圖 | 依序出現的資訊物件 | cue 關鍵詞 | 退出／狀態改變 |
| --- | --- | --- | --- | --- | --- |
| b1 | | hook | | | fade |

規則：

- 每次只新增一個清楚的理解步驟。
- 畫面可維持同一主構圖數秒，但通常每 0.3–0.8 秒要有一個有意義的狀態變化。
- 不得為了保持動態而加入與內容無關的漂浮、彈跳或裝飾。
- cue 必須是旁白真的講出來的字，\`script-align\` 階段才對得到時間。
`,

    'DESIGN.zh-TW.md': `# ${brief.project} · 視覺設計

## Composition profile

| 項目 | 值 |
| --- | --- |
| 尺寸 | ${width} × ${height} |
| fps | ${fps} |
| 比例類型 | ${aspect} |

座標一律從 \`src/layout/compositionProfiles.ts\` 讀取，**禁止在元件裡硬寫數值**。
換比例時只改 profile 與 \`resolveProgramLayout\` 的 layout variant。

## 題材視覺語法

- 主色／輔色／強調色：見 \`src/theme/programTheme.ts\`
- 轉場語彙：（依題材定義；歷史可用墨痕／年代擦除，科技商業醫療須另建）
- 「日式節目」指的是資訊編舞方法，**不要求套用和風素材**。

## 分層

| 層級 | 用途 | 不可混用 |
| --- | --- | --- |
| 節目 Logo | 系列識別 | |
| 章節標題 | 段落定位 | 不可當旁白字幕 |
| 場內資訊標籤 | 畫面內的物件說明 | **不能取代完整旁白字幕** |
| 資料註記 | 來源、單位 | |
| 旁白字幕 | ${brief.captions === 'designed' ? '設計高光字幕' : '一般清楚字幕'} | |
`,
  };
}

function dims(brief) {
  return {
    width: brief.width ?? 1080,
    height: brief.height ?? 1920,
    fps: brief.fps ?? 30,
  };
}

function classifyAspect(width, height) {
  if (width === height) return 'square';
  const r = width / height;
  if (Math.abs(r - 16 / 9) < 0.01 || Math.abs(r - 9 / 16) < 0.01 || Math.abs(r - 4 / 5) < 0.01) {
    return width > height ? 'landscape' : 'portrait';
  }
  return width > height ? 'landscape' : 'portrait';
}

export function componentName(brief) {
  return brief.project
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join('');
}

export function compositionId(brief) {
  return componentName(brief);
}
