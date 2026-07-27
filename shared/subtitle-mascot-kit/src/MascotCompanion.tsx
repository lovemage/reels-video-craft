import {useMemo} from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';

const REACTION_WINDOW = 22;
const WALK_DURATION = 24;
const SLEEP_GAP = 90;

// Positions the mascot walks between (px from left), visited in order and
// looped — a simple zigzag so it doesn't march off one edge of the frame.
const WAYPOINTS = [150, 470, 790, 470];

type MascotPose = 'idle' | 'jump' | 'tilt' | 'sleep' | 'walk';

type MascotState = {
  x: number;
  pose: MascotPose;
  localFrame: number;
  facingRight: boolean;
};

const getMascotState = (frame: number, events: number[]): MascotState => {
  if (events.length === 0) {
    return {x: WAYPOINTS[0], pose: 'idle', localFrame: frame, facingRight: false};
  }

  let idx = -1;
  for (let i = 0; i < events.length; i++) {
    if (events[i] <= frame) {
      idx = i;
    } else {
      break;
    }
  }

  if (idx === -1) {
    const gapToFirst = events[0] - frame;
    return {
      x: WAYPOINTS[0],
      pose: gapToFirst > SLEEP_GAP ? 'sleep' : 'idle',
      localFrame: frame,
      facingRight: false,
    };
  }

  const currentX = WAYPOINTS[idx % WAYPOINTS.length];
  const reactionLocal = frame - events[idx];

  if (reactionLocal < REACTION_WINDOW) {
    return {
      x: currentX,
      pose: idx % 2 === 0 ? 'jump' : 'tilt',
      localFrame: reactionLocal,
      facingRight: false,
    };
  }

  if (idx + 1 < events.length) {
    const nextEventFrame = events[idx + 1];
    const walkStart = Math.max(events[idx] + REACTION_WINDOW, nextEventFrame - WALK_DURATION);

    if (frame >= walkStart) {
      const nextX = WAYPOINTS[(idx + 1) % WAYPOINTS.length];
      const span = Math.max(1, nextEventFrame - walkStart);
      const progress = Math.min(1, Math.max(0, (frame - walkStart) / span));
      return {
        x: currentX + (nextX - currentX) * progress,
        pose: 'walk',
        localFrame: frame - walkStart,
        facingRight: nextX > currentX,
      };
    }
  }

  const gapForward = idx + 1 < events.length ? events[idx + 1] - frame : Infinity;
  const gapBack = frame - events[idx];
  const nearestGap = Math.min(gapForward, gapBack);

  return {
    x: currentX,
    pose: nearestGap > SLEEP_GAP ? 'sleep' : 'idle',
    localFrame: frame,
    facingRight: false,
  };
};

// A fixed pixel-art cat mascot that lives across the whole timeline (unlike
// the caption highlights, which are scoped to their own per-line Sequence).
// It naps when nothing is happening, walks to the next waypoint as a
// highlight approaches, and reacts — jump or head-tilt, alternating — the
// instant a caption keyword highlights, using the same global frame numbers.
export const MascotCompanion: React.FC<{highlightFrames: number[]}> = ({
  highlightFrames,
}) => {
  const frame = useCurrentFrame();

  const sortedEvents = useMemo(
    () => [...highlightFrames].sort((a, b) => a - b),
    [highlightFrames],
  );

  const state = useMemo(() => getMascotState(frame, sortedEvents), [frame, sortedEvents]);

  const idleBob = Math.sin((frame / 30) * Math.PI * 2 * 0.5) * 6;
  const sleepBob = Math.sin((frame / 30) * Math.PI * 2 * 0.22) * 3;
  const walkBob = Math.abs(Math.sin((state.localFrame / 30) * Math.PI * 2 * 1.6)) * 8;
  // Two-frame walk cycle: legs gathered (walk-2) on the lift, splayed
  // (walk-1) on the footfall — reuses walkBob so the leg swap always lands
  // on the same beat as the vertical bounce instead of drifting out of sync.
  const walkFrame = walkBob > 4 ? 2 : 1;

  const reactionScale =
    state.pose === 'jump' || state.pose === 'tilt'
      ? interpolate(state.localFrame, [0, 4, 12, REACTION_WINDOW], [0.85, 1.18, 1.05, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        })
      : 1;

  const reactionRotate =
    state.pose === 'tilt'
      ? interpolate(state.localFrame, [0, 6, REACTION_WINDOW], [0, -12, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })
      : 0;

  const translateY =
    state.pose === 'sleep' ? sleepBob : state.pose === 'walk' ? -walkBob : state.pose === 'idle' ? idleBob : 0;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: state.x - 80,
          bottom: 560,
          width: 160,
          height: 160,
          transform: `translateY(${translateY}px) scale(${reactionScale}) rotate(${reactionRotate}deg)`,
          filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3))',
        }}
      >
        <Img
          src={staticFile(
            state.pose === 'walk'
              ? `mascot/cat-walk-${walkFrame}.png`
              : `mascot/cat-${state.pose}.png`,
          )}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            imageRendering: 'pixelated',
            transform: state.pose === 'walk' && state.facingRight ? 'scaleX(-1)' : undefined,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
