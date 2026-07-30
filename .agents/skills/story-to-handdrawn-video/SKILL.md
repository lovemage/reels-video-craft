---
name: story-to-handdrawn-video
description: Convert Chinese story copy or ordered local images into a hand-drawn diary-comic animation with handwritten captions, left-to-right black-and-white-to-color reveals, optional page-flip transitions, safe uncropped framing, and a silent Remotion picture track.
---

# Story to Hand-drawn Video

Use the renderer at `/home/ivan-bai/projects/seedance/shared/story-to-handdrawn-video`. Run its `scripts/run_story_video.py` with `STORY_VIDEO_PROJECT=/home/ivan-bai/projects/seedance/shared/story-to-handdrawn-video`; do not rely on an author-specific path.

## Seedance integration rules

1. Before generating a new video, follow the repository `AGENTS.md`: confirm the video mode and voiceover choice. This renderer produces the silent picture track only.
2. Keep generated material and its silent track under the active `production/<project>/` directory. Do not overwrite existing deliverables.
3. For Seedance, use the renderer's native 9:16 mode (`--format 9:16`). It produces a 1080×1920 canvas with a taller, uncropped illustration field and preserved white safe border; do not add a 3:4 letterbox wrapper.
4. If narration exists, first process it with the local `auto-editor` skill. Use the edited narration duration to time the final composition, captions, and scene cuts.

## Renderer workflow

1. Accept inline Chinese story text, a UTF-8 text file, or ordered local images.
2. Preserve the user's wording. For text input, keep one complete sentence as one beat by default and split only long compound sentences at natural narrative turns.
3. For Seedance M4, always pass `--grid 3x3 --max-grid-images 2 --text-mode font`. Pack beats row-major into at most two masters; each master is exactly 3×3. Reject more than 18 beats so the storyboard can be merged before any paid generation.
4. For uploaded composite pages, automatically crop the handwritten caption and illustration, then derive an aligned black-and-white plate locally.
5. In direct-cut mode, keep the order `text → bw_full → color`; reveal every stage from left to right.
6. In page-flip mode, preserve the untouched uploaded master and show it statically before curling the page from the bottom-right corner. Do not add caption, black-and-white, or recoloring stages. Retain a faded version of the source page on the paper underside.
7. Keep all illustration marks inside the white safe border. Use contained framing and never `cover` cropping.
8. Produce a silent MP4. Voiceover and optional BGM are post-production tasks.
9. Report the scene count, duration, output path, and whether the result is plan-only, preview, or final.

## Commands

Always set the project path for commands:

```bash
export STORY_VIDEO_PROJECT=/home/ivan-bai/projects/seedance/shared/story-to-handdrawn-video
cd "$STORY_VIDEO_PROJECT"
```

Text-story plan without image generation:

```bash
python3 scripts/run_story_video.py --input /absolute/story.txt --title "故事标题" --format 9:16 --grid 3x3 --max-grid-images 2 --text-mode font --mode plan
```

Prepare Codex Image2 jobs, then import and render:

```bash
python3 scripts/run_story_video.py --input /absolute/story.txt --title "故事标题" --format 9:16 --grid 3x3 --max-grid-images 2 --text-mode font --mode generate
python3 scripts/run_story_video.py --mode import
python3 scripts/run_story_video.py --format 9:16 --mode render
```

Use `--generator codex` by default. Use `--generator api` only when the user explicitly selects the API fallback and `OPENAI_API_KEY` is available. Use `--force` only when the user explicitly wants an existing generated batch replaced.

For time jumps, ambiguous pronouns, medical scenes, or age-sensitive characters, provide a JSON visual plan keyed by two-digit scene id through `--visual-plan`.

## Output contract

- Seedance text-story final: `<renderer>/out/picture_silent-9x16.mp4`
- Seedance text-story preview: `<renderer>/out/picture_silent-9x16-preview.mp4`
- Seedance uploaded-image final: `<renderer>/out/uploaded_picture_silent-9x16.mp4`
- Seedance uploaded-image preview: `<renderer>/out/uploaded_picture_silent-9x16-preview.mp4`
- Resolution: final 1080×1920; preview 720×1280
- Codec/audio: H.264, silent

Do not run a separate validation or test command unless the user explicitly requests it.
