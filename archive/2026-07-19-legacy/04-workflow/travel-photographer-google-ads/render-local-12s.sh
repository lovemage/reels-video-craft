#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="/home/ivan-bai/projects/seedance"
WORK_DIR="$PROJECT_ROOT/assets/drafts/travel-photographer-local"
OUTPUT_DIR="$PROJECT_ROOT/assets/outputs"
FONT_LATIN="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_CJK="/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"

mkdir -p "$WORK_DIR" "$OUTPUT_DIR"

render_stills() {
  local scene_id="$1"
  local source_image="$2"
  local crop_width="$3"
  local crop_x="$4"
  local scene_label="$5"

  ffmpeg -hide_banner -loglevel error -y \
    -i "$source_image" \
    -vf "scale=1290:720,crop=1280:720,setsar=1" \
    -frames:v 1 "$WORK_DIR/${scene_id}-base.png"

  ffmpeg -hide_banner -loglevel error -y \
    -i "$WORK_DIR/${scene_id}-base.png" \
    -vf "crop=${crop_width}:720:${crop_x}:0,scale=1280:720,setsar=1" \
    -frames:v 1 "$WORK_DIR/${scene_id}-pov.png"

  ffmpeg -hide_banner -loglevel error -y \
    -i "$WORK_DIR/${scene_id}-pov.png" \
    -vf "gblur=sigma=8,drawbox=x=0:y=0:w=1280:h=52:color=black@0.34:t=fill,drawbox=x=0:y=668:w=1280:h=52:color=black@0.34:t=fill,drawbox=x=515:y=228:w=250:h=190:color=white@0.94:t=4,drawbox=x=635:y=316:w=10:h=2:color=white@0.94:t=fill,drawbox=x=639:y=312:w=2:h=10:color=white@0.94:t=fill,drawtext=fontfile=${FONT_LATIN}:text='${scene_label}':fontcolor=white:fontsize=24:x=34:y=13,drawtext=fontfile=${FONT_LATIN}:text='AF-C   1/250   F5.6   ISO 200':fontcolor=white:fontsize=22:x=34:y=681" \
    -frames:v 1 "$WORK_DIR/${scene_id}-viewfinder-soft.png"

  ffmpeg -hide_banner -loglevel error -y \
    -i "$WORK_DIR/${scene_id}-pov.png" \
    -vf "drawbox=x=0:y=0:w=1280:h=52:color=black@0.34:t=fill,drawbox=x=0:y=668:w=1280:h=52:color=black@0.34:t=fill,drawbox=x=515:y=228:w=250:h=190:color=0x5CFF7A@0.96:t=4,drawbox=x=635:y=316:w=10:h=2:color=0x5CFF7A@0.96:t=fill,drawbox=x=639:y=312:w=2:h=10:color=0x5CFF7A@0.96:t=fill,drawtext=fontfile=${FONT_LATIN}:text='${scene_label}':fontcolor=white:fontsize=24:x=34:y=13,drawtext=fontfile=${FONT_LATIN}:text='AF LOCK   1/250   F5.6   ISO 200':fontcolor=0x5CFF7A:fontsize=22:x=34:y=681" \
    -frames:v 1 "$WORK_DIR/${scene_id}-viewfinder-locked.png"

  ffmpeg -hide_banner -loglevel error -y \
    -i "$WORK_DIR/${scene_id}-base.png" \
    -i "$WORK_DIR/${scene_id}-pov.png" \
    -filter_complex "[0:v]gblur=sigma=10,eq=brightness=0.10:saturation=0.68[bg];[1:v]crop=730:720:275:0,scale=485:478[photo];[bg]drawbox=x=382:y=40:w=555:h=675:color=black@0.18:t=fill,drawbox=x=370:y=28:w=555:h=687:color=0xFFFDF7:t=fill[card];[card][photo]overlay=x=405:y=72[tmp];[tmp]drawbox=x=404:y=71:w=487:h=480:color=0xD9DAD6:t=2,drawtext=fontfile=${FONT_LATIN}:text='aw-esim.com':fontcolor=0x28323A:fontsize=40:x=(w-text_w)/2:y=625[out]" \
    -map "[out]" -frames:v 1 "$WORK_DIR/${scene_id}-polaroid.png"
}

render_scene() {
  local scene_id="$1"
  local lens_x="$2"
  local lens_y="$3"
  local output_name="$4"

  ffmpeg -hide_banner -loglevel error -y \
    -loop 1 -framerate 24 -i "$WORK_DIR/${scene_id}-base.png" \
    -loop 1 -framerate 24 -i "$WORK_DIR/${scene_id}-viewfinder-soft.png" \
    -loop 1 -framerate 24 -i "$WORK_DIR/${scene_id}-viewfinder-locked.png" \
    -f lavfi -i "color=c=white:s=1280x720:r=24" \
    -loop 1 -framerate 24 -i "$WORK_DIR/${scene_id}-polaroid.png" \
    -f lavfi -i "anullsrc=r=48000:cl=stereo" \
    -f lavfi -i "sine=frequency=1240:sample_rate=48000:duration=0.05" \
    -f lavfi -i "anoisesrc=color=white:sample_rate=48000:duration=0.08" \
    -filter_complex "[0:v]zoompan=z='if(lte(on,4),1,1+4*(on-4)/12)':x='(${lens_x}-iw/zoom/2)*(zoom-1)/4':y='(${lens_y}-ih/zoom/2)*(zoom-1)/4':d=1:s=1280x720:fps=24,trim=end_frame=17,setpts=PTS-STARTPTS,setsar=1[v0];[1:v]trim=end_frame=6,setpts=PTS-STARTPTS,setsar=1[v1];[2:v]trim=end_frame=8,setpts=PTS-STARTPTS,setsar=1[v2];[3:v]trim=end_frame=2,setpts=PTS-STARTPTS,setsar=1[v3];[4:v]trim=end_frame=21,setpts=PTS-STARTPTS,setsar=1[v4];[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0,format=yuv420p[v];[5:a]atrim=duration=2.25,volume=0.04[a0];[6:a]aformat=channel_layouts=stereo,volume=0.18,adelay=950|950[beep];[7:a]aformat=channel_layouts=stereo,highpass=f=1800,lowpass=f=7200,volume=0.38,adelay=1280|1280[click];[a0][beep][click]amix=inputs=3:duration=first:normalize=0,atrim=duration=2.25[a]" \
    -map "[v]" -map "[a]" -t 2.25 -r 24 \
    -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 192k -ar 48000 -movflags +faststart \
    "$OUTPUT_DIR/$output_name"
}

render_stills \
  "seoul" \
  "$PROJECT_ROOT/assets/drafts/travel-photographer-02-seoul-16x9-keyframe.png" \
  700 580 "SEOUL / KR"
render_stills \
  "chiang-mai" \
  "$PROJECT_ROOT/assets/drafts/travel-photographer-03-chiang-mai-16x9-keyframe.png" \
  720 460 "CHIANG MAI / TH"
render_stills \
  "san-francisco" \
  "$PROJECT_ROOT/assets/drafts/travel-photographer-04-san-francisco-16x9-keyframe.png" \
  850 0 "SAN FRANCISCO / US"

render_scene "seoul" 485 291 \
  "travel-photographer-seoul-viewfinder-polaroid-16x9-local.mp4"
render_scene "chiang-mai" 417 241 \
  "travel-photographer-chiang-mai-viewfinder-polaroid-16x9-local.mp4"
render_scene "san-francisco" 915 236 \
  "travel-photographer-san-francisco-viewfinder-polaroid-16x9-local.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -ss 4.70 \
  -i "$OUTPUT_DIR/travel-photographer-kyoto-viewfinder-polaroid-16x9-test-v2.mp4" \
  -frames:v 1 "$WORK_DIR/kyoto-final.png"

ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "color=c=0xEDF7F5:s=1280x720:r=24" \
  -i "$WORK_DIR/kyoto-final.png" \
  -i "$WORK_DIR/seoul-polaroid.png" \
  -i "$WORK_DIR/chiang-mai-polaroid.png" \
  -i "$WORK_DIR/san-francisco-polaroid.png" \
  -filter_complex "[1:v]crop=600:700:350:20,scale=270:315[p1];[2:v]crop=600:700:350:20,scale=270:315[p2];[3:v]crop=600:700:350:20,scale=270:315[p3];[4:v]crop=600:700:350:20,scale=270:315[p4];[0:v]drawtext=fontfile=${FONT_CJK}:text='四國旅行 · 一張 eSIM':fontcolor=0x183D3A:fontsize=50:x=(w-text_w)/2:y=48,drawtext=fontfile=${FONT_LATIN}:text='JP':fontcolor=0x3A6862:fontsize=24:x=163:y=140,drawtext=fontfile=${FONT_LATIN}:text='KR':fontcolor=0x3A6862:fontsize=24:x=473:y=140,drawtext=fontfile=${FONT_LATIN}:text='TH':fontcolor=0x3A6862:fontsize=24:x=783:y=140,drawtext=fontfile=${FONT_LATIN}:text='US':fontcolor=0x3A6862:fontsize=24:x=1093:y=140[b0];[b0][p1]overlay=40:175[b1];[b1][p2]overlay=350:175[b2];[b2][p3]overlay=660:175[b3];[b3][p4]overlay=970:175[b4];[b4]drawtext=fontfile=${FONT_LATIN}:text='aw-esim.com':fontcolor=0x183D3A:fontsize=42:x=(w-text_w)/2:y=590[out]" \
  -map "[out]" -frames:v 1 "$WORK_DIR/contact-sheet.png"

ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "color=c=0xEDF7F5:s=1280x720:r=24" \
  -vf "drawtext=fontfile=${FONT_LATIN}:text='JAPAN   KOREA   THAILAND   USA':fontcolor=0x5B7B77:fontsize=25:x=(w-text_w)/2:y=92,drawtext=fontfile=${FONT_CJK}:text='四國旅行，一張 eSIM 就夠':fontcolor=0x183D3A:fontsize=54:x=(w-text_w)/2:y=190,drawtext=fontfile=${FONT_LATIN}:text='aw-esim.com':fontcolor=0x102F2C:fontsize=78:x=(w-text_w)/2:y=310,drawbox=x=490:y=470:w=300:h=88:color=0x1C6E66:t=fill,drawtext=fontfile=${FONT_CJK}:text='立即上網':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=488" \
  -frames:v 1 "$WORK_DIR/end-card.png"

ffmpeg -hide_banner -loglevel error -y \
  -i "$OUTPUT_DIR/travel-photographer-kyoto-viewfinder-polaroid-16x9-test-v2.mp4" \
  -filter_complex "[0:v]setpts=PTS/1.994122,fps=24,format=yuv420p[v];[0:a]atempo=1.994122,atrim=duration=2.55[a]" \
  -map "[v]" -map "[a]" -t 2.55 -r 24 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 \
  "$WORK_DIR/kyoto-2.55s.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -loop 1 -framerate 24 -i "$WORK_DIR/contact-sheet.png" \
  -f lavfi -i "anullsrc=r=48000:cl=stereo" \
  -filter_complex "[0:v]zoompan=z='1+0.025*on/28':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24,trim=end_frame=29,setpts=PTS-STARTPTS,format=yuv420p[v];[1:a]atrim=duration=1.2[a]" \
  -map "[v]" -map "[a]" -t 1.2 -r 24 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 \
  "$WORK_DIR/contact-sheet-1.2s.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -loop 1 -framerate 24 -i "$WORK_DIR/end-card.png" \
  -f lavfi -i "anullsrc=r=48000:cl=stereo" \
  -f lavfi -i "sine=frequency=659.25:sample_rate=48000:duration=0.16" \
  -f lavfi -i "sine=frequency=880:sample_rate=48000:duration=0.22" \
  -filter_complex "[0:v]trim=end_frame=48,setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.18,format=yuv420p[v];[1:a]atrim=duration=2.0,volume=0.02[a0];[2:a]aformat=channel_layouts=stereo,volume=0.16,adelay=340|340[c1];[3:a]aformat=channel_layouts=stereo,volume=0.12,adelay=470|470[c2];[a0][c1][c2]amix=inputs=3:duration=first:normalize=0,atrim=duration=2.0,afade=t=out:st=1.70:d=0.30[a]" \
  -map "[v]" -map "[a]" -t 2.0 -r 24 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 \
  "$WORK_DIR/end-card-2.0s.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -i "$WORK_DIR/kyoto-2.55s.mp4" \
  -i "$OUTPUT_DIR/travel-photographer-seoul-viewfinder-polaroid-16x9-local.mp4" \
  -i "$OUTPUT_DIR/travel-photographer-chiang-mai-viewfinder-polaroid-16x9-local.mp4" \
  -i "$OUTPUT_DIR/travel-photographer-san-francisco-viewfinder-polaroid-16x9-local.mp4" \
  -i "$WORK_DIR/contact-sheet-1.2s.mp4" \
  -i "$WORK_DIR/end-card-2.0s.mp4" \
  -filter_complex "[0:v]settb=AVTB[v0];[1:v]settb=AVTB[v1];[2:v]settb=AVTB[v2];[3:v]settb=AVTB[v3];[4:v]settb=AVTB[v4];[5:v]settb=AVTB[v5];[v0][v1]xfade=transition=slideleft:duration=0.10:offset=2.45[x1];[x1][v2]xfade=transition=slideleft:duration=0.10:offset=4.60[x2];[x2][v3]xfade=transition=slideleft:duration=0.10:offset=6.75[x3];[x3][v4]xfade=transition=fade:duration=0.10:offset=8.90[x4];[x4][v5]xfade=transition=fade:duration=0.10:offset=10.00,format=yuv420p[v];[0:a][1:a]acrossfade=d=0.10:c1=tri:c2=tri[a1];[a1][2:a]acrossfade=d=0.10:c1=tri:c2=tri[a2];[a2][3:a]acrossfade=d=0.10:c1=tri:c2=tri[a3];[a3][4:a]acrossfade=d=0.10:c1=tri:c2=tri[a4];[a4][5:a]acrossfade=d=0.10:c1=tri:c2=tri,atrim=duration=12.0[a]" \
  -map "[v]" -map "[a]" -t 12.0 -r 24 \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart \
  "$OUTPUT_DIR/travel-photographer-four-countries-google-ads-12s-16x9.mp4"

echo "$OUTPUT_DIR/travel-photographer-four-countries-google-ads-12s-16x9.mp4"
