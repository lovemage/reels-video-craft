#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ASSET_DIR="$ROOT_DIR/assets/drafts/aw-esim-retro-manga"
OUTPUT_DIR="$ROOT_DIR/assets/outputs"
OUTPUT_FILE="$OUTPUT_DIR/aw-esim-retro-manga-12s-16x9-v1.mp4"
FONT_CJK="/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
FONT_LATIN="/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"

mkdir -p "$OUTPUT_DIR"

ffmpeg -hide_banner -loglevel warning -y \
  -loop 1 -framerate 24 -t 2.8 -i "$ASSET_DIR/01-roaming-monster.png" \
  -loop 1 -framerate 24 -t 2.4 -i "$ASSET_DIR/02-activate-esim.png" \
  -loop 1 -framerate 24 -t 4.3 -i "$ASSET_DIR/03-four-countries.png" \
  -loop 1 -framerate 24 -t 3.1 -i "$ASSET_DIR/04-end-card-v2-logo.png" \
  -f lavfi -i "anoisesrc=color=pink:sample_rate=48000:duration=12:amplitude=0.012" \
  -f lavfi -i "sine=frequency=165:sample_rate=48000:duration=0.38" \
  -f lavfi -i "sine=frequency=920:sample_rate=48000:duration=0.08" \
  -f lavfi -i "sine=frequency=1380:sample_rate=48000:duration=0.16" \
  -f lavfi -i "anoisesrc=color=white:sample_rate=48000:duration=0.65:amplitude=0.18" \
  -f lavfi -i "sine=frequency=1240:sample_rate=48000:duration=0.06" \
  -f lavfi -i "sine=frequency=523.25:sample_rate=48000:duration=0.7" \
  -f lavfi -i "sine=frequency=659.25:sample_rate=48000:duration=0.7" \
  -f lavfi -i "sine=frequency=783.99:sample_rate=48000:duration=0.7" \
  -filter_complex "
    [0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,
      zoompan=z='1.03+0.04*on/67':x='iw/2-iw/zoom/2+6*sin(on*0.8)*gte(on,25)':y='ih/2-ih/zoom/2+4*cos(on*0.7)*gte(on,25)':d=1:s=1920x1080:fps=24,
      trim=duration=2.8,setpts=PTS-STARTPTS,
      drawtext=fontfile=${FONT_CJK}:text='落地第一秒——':fontcolor=0x171A12:fontsize=58:x=92:y=72:box=1:boxcolor=0xFFC515@0.95:boxborderw=18:enable='gte(t,0.18)'[v0];

    [1:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,
      zoompan=z='1.02+0.09*on/57':x='(iw-iw/zoom)*0.16':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=24,
      trim=duration=2.4,setpts=PTS-STARTPTS,
      drawbox=x=655:y=906:w=610:h=106:color=0xFFC515@0.96:t=fill:enable='gte(t,0.18)',
      drawtext=fontfile=${FONT_CJK}:text='先裝 AW eSIM':fontcolor=0x171A12:fontsize=62:x=(w-text_w)/2:y=920:enable='gte(t,0.18)'[v1];

    [2:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,
      zoompan=z='1.02+0.04*on/103':x='(iw-iw/zoom)*on/103':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=24,
      trim=duration=4.3,setpts=PTS-STARTPTS,
      drawbox=x=500:y=902:w=920:h=112:color=0x17252A@0.84:t=fill:enable='gte(t,0.35)',
      drawtext=fontfile=${FONT_CJK}:text='旅遊上網，先準備好':fontcolor=0xFFF4D4:fontsize=62:x=(w-text_w)/2:y=919:enable='gte(t,0.35)'[v2];

    [3:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,
      zoompan=z='1.04-0.04*on/74':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=24,
      trim=duration=3.1,setpts=PTS-STARTPTS,
      drawtext=fontfile=${FONT_CJK}:text='帳單怪獸':fontcolor=0x171A12:fontsize=76:x=1070:y=392:enable='gte(t,0.18)',
      drawtext=fontfile=${FONT_CJK}:text='回去折紙！':fontcolor=0xD63D23:fontsize=92:x=1048:y=482:enable='gte(t,0.28)',
      drawtext=fontfile=${FONT_LATIN}:text='aw-esim.com':fontcolor=0x171A12:fontsize=58:x=1100:y=628:enable='gte(t,0.58)',
      drawbox=x=1190:y=724:w=310:h=84:color=0xFFC515@0.98:t=fill:enable='gte(t,0.78)',
      drawtext=fontfile=${FONT_CJK}:text='立即選購':fontcolor=0x171A12:fontsize=46:x=1255:y=739:enable='gte(t,0.78)'[v3];

    [v0][v1]xfade=transition=wipeleft:duration=0.2:offset=2.6[x1];
    [x1][v2]xfade=transition=fadewhite:duration=0.2:offset=4.8[x2];
    [x2][v3]xfade=transition=wipeup:duration=0.2:offset=8.9,format=yuv420p[vout];

    [4:a]aformat=channel_layouts=stereo,volume=0.32[bed];
    [5:a]aformat=channel_layouts=stereo,volume=0.28,adelay=1850|1850[buzz];
    [6:a]aformat=channel_layouts=stereo,volume=0.34,adelay=3100|3100[tap];
    [7:a]aformat=channel_layouts=stereo,volume=0.26,adelay=3210|3210[activate];
    [8:a]highpass=f=900,lowpass=f=7800,aformat=channel_layouts=stereo,volume=0.72,adelay=4780|4780[whoosh];
    [9:a]aformat=channel_layouts=stereo,asplit=4[p1][p2][p3][p4];
    [p1]volume=0.22,adelay=5450|5450[q1];
    [p2]volume=0.22,adelay=6250|6250[q2];
    [p3]volume=0.22,adelay=7050|7050[q3];
    [p4]volume=0.22,adelay=7850|7850[q4];
    [10:a]aformat=channel_layouts=stereo,volume=0.14,adelay=9180|9180[c1];
    [11:a]aformat=channel_layouts=stereo,volume=0.12,adelay=9180|9180[c2];
    [12:a]aformat=channel_layouts=stereo,volume=0.10,adelay=9180|9180[c3];
    [bed][buzz][tap][activate][whoosh][q1][q2][q3][q4][c1][c2][c3]
      amix=inputs=12:duration=longest:normalize=0,atrim=duration=12,
      loudnorm=I=-20:LRA=7:TP=-2,afade=t=out:st=11.55:d=0.45[aout]
  " \
  -map "[vout]" -map "[aout]" -t 12 -r 24 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart \
  "$OUTPUT_FILE"

printf '%s\n' "$OUTPUT_FILE"
