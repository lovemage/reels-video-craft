import type {Caption} from '@remotion/captions';
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type HighlightVariant = {color: string; glow: string};
export type HighlightKeyword = {phrase: string; variant: number};
export type HighlightMap = Record<number, HighlightKeyword[]>;
export type EnglishLines = Record<number, string>;

export const DEFAULT_VARIANTS: HighlightVariant[] = [
  {color: '#f3d17a', glow: 'rgba(243, 209, 122, 0.7)'},
  {color: '#a3d0bd', glow: 'rgba(163, 208, 189, 0.65)'},
  {color: '#e6906f', glow: 'rgba(230, 144, 111, 0.65)'},
];

const PLAIN_TEXT_COLOR = '#fffdf7';
const TEXT_STROKE = '1.25px rgba(10, 8, 6, 0.7)';
const TEXT_SHADOW =
  '0 1px 2px rgba(0, 0, 0, 0.55), 0 4px 14px rgba(0, 0, 0, 0.4)';

const ENGLISH_STROKE = '0.75px rgba(10, 8, 6, 0.6)';
const ENGLISH_TEXT_SHADOW = '0 1px 2px rgba(0, 0, 0, 0.5), 0 3px 10px rgba(0, 0, 0, 0.35)';

// Trailing punctuation only — a mid-sentence comma or period stays, but a
// sentence-ending mark right before the cut is dropped instead of shown.
const TRAILING_PUNCTUATION = /[，。、,.!?！？;；:：—–…-]+$/u;

export const trimTrailingPunctuation = (text: string): string =>
  text.replace(TRAILING_PUNCTUATION, '');

type Segment = {
  text: string;
  charStart: number;
  highlight: {variant: number} | null;
};

const buildSegments = (text: string, keywords: HighlightKeyword[] | undefined): Segment[] => {
  if (!keywords || keywords.length === 0) {
    return [{text, charStart: 0, highlight: null}];
  }

  const matches = keywords
    .map((keyword) => ({...keyword, index: text.indexOf(keyword.phrase)}))
    .filter((match) => match.index !== -1)
    .sort((a, b) => a.index - b.index);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.index < cursor) {
      continue;
    }
    if (match.index > cursor) {
      segments.push({text: text.slice(cursor, match.index), charStart: cursor, highlight: null});
    }
    segments.push({text: match.phrase, charStart: match.index, highlight: {variant: match.variant}});
    cursor = match.index + match.phrase.length;
  }

  if (cursor < text.length) {
    segments.push({text: text.slice(cursor), charStart: cursor, highlight: null});
  }

  return segments;
};

const HighlightSpan: React.FC<{
  text: string;
  variant: number;
  variants: HighlightVariant[];
  popFrame: number;
  frame: number;
}> = ({text, variant, variants, popFrame, frame}) => {
  const {color, glow} = variants[variant % variants.length];

  const pop = interpolate(frame, [popFrame, popFrame + 4, popFrame + 12], [0.72, 1.2, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });

  const rise = interpolate(frame, [popFrame, popFrame + 8], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <span
      style={{
        display: 'inline-block',
        color,
        WebkitTextStroke: TEXT_STROKE,
        textShadow: `0 0 26px ${glow}, ${TEXT_SHADOW}`,
        transform: `translateY(${frame < popFrame ? 0 : rise}px) scale(${frame < popFrame ? 1 : pop})`,
      }}
    >
      {text}
    </span>
  );
};

const CaptionCard: React.FC<{
  caption: Caption;
  durationInFrames: number;
  keywords: HighlightKeyword[] | undefined;
  englishText: string | undefined;
  variants: HighlightVariant[];
}> = ({caption, durationInFrames, keywords, englishText, variants}) => {
  const frame = useCurrentFrame();
  const zhText = trimTrailingPunctuation(caption.text);
  const enText = englishText ? trimTrailingPunctuation(englishText) : '';
  const totalChars = Array.from(zhText).length;
  const segments = buildSegments(zhText, keywords);

  const entranceOpacity = interpolate(frame, [0, 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const entranceTranslate = interpolate(frame, [0, 6], ['0px 12px', '0px 0px'], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '0 84px 300px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          opacity: entranceOpacity,
          translate: entranceTranslate,
        }}
      >
        <div
          style={{
            maxWidth: 940,
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.5,
            letterSpacing: 0.2,
            textAlign: 'center',
            color: PLAIN_TEXT_COLOR,
            WebkitTextStroke: TEXT_STROKE,
            textShadow: TEXT_SHADOW,
          }}
        >
          {segments.map((segment, segmentIndex) => {
            if (!segment.highlight) {
              return <span key={segmentIndex}>{segment.text}</span>;
            }

            const popFrame = (durationInFrames * segment.charStart) / totalChars;

            return (
              <HighlightSpan
                key={segmentIndex}
                text={segment.text}
                variant={segment.highlight.variant}
                variants={variants}
                popFrame={popFrame}
                frame={frame}
              />
            );
          })}
        </div>
        {enText && (
          <div
            style={{
              maxWidth: 860,
              fontSize: 29,
              fontWeight: 500,
              lineHeight: 1.4,
              letterSpacing: 0.1,
              textAlign: 'center',
              color: 'rgba(255, 253, 247, 0.78)',
              WebkitTextStroke: ENGLISH_STROKE,
              textShadow: ENGLISH_TEXT_SHADOW,
            }}
          >
            {enText}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export const getCaptionFrameRange = (caption: Caption, fps: number) => {
  const startFrame = Math.round((caption.startMs / 1000) * fps);
  const endFrame = Math.max(startFrame + 1, Math.round((caption.endMs / 1000) * fps));
  return {startFrame, durationInFrames: endFrame - startFrame};
};

// Global (timeline-absolute) frame for every highlighted keyword's pop
// moment — hand this to a persistent, non-Sequence-scoped companion (like
// MascotCompanion) that needs to react at the same instants the captions do.
export const computeHighlightFrames = (
  captions: Caption[],
  fps: number,
  highlightMap: HighlightMap,
): number[] => {
  const frames: number[] = [];

  captions.forEach((caption, index) => {
    const keywords = highlightMap[index];
    if (!keywords || keywords.length === 0) {
      return;
    }

    const zhText = trimTrailingPunctuation(caption.text);
    const totalChars = Array.from(zhText).length;
    const segments = buildSegments(zhText, keywords);
    const {startFrame, durationInFrames} = getCaptionFrameRange(caption, fps);

    segments.forEach((segment) => {
      if (segment.highlight) {
        const popFrame = (durationInFrames * segment.charStart) / totalChars;
        frames.push(startFrame + Math.round(popFrame));
      }
    });
  });

  return frames;
};

export type CaptionsOverlayProps = {
  captions: Caption[];
  highlightMap?: HighlightMap;
  englishLines?: EnglishLines;
  variants?: HighlightVariant[];
};

// No background card — bold stroked text sits directly on the footage.
// Every line can carry a small set of curated highlight keywords (never
// punctuation, never every word) plus an optional English line underneath.
// Reusable across projects: supply this project's own highlightMap /
// englishLines: everything else (style, timing, punctuation trim) is fixed.
export const CaptionsOverlay: React.FC<CaptionsOverlayProps> = ({
  captions,
  highlightMap = {},
  englishLines = {},
  variants = DEFAULT_VARIANTS,
}) => {
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill>
      {captions.map((caption, index) => {
        const {startFrame, durationInFrames} = getCaptionFrameRange(caption, fps);

        return (
          <Sequence
            key={`${caption.startMs}-${index}`}
            name={`字幕 ${index + 1}`}
            from={startFrame}
            durationInFrames={durationInFrames}
          >
            <CaptionCard
              caption={caption}
              durationInFrames={durationInFrames}
              keywords={highlightMap[index]}
              englishText={englishLines[index]}
              variants={variants}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
