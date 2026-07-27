# video-flow

A production workflow for AI-assisted video, built for agent-and-human collaboration.

You hand it source material — a talking-head recording, a voiceover, a script, or just a topic. It asks what you want, rules out the production methods that can't deliver it, and then tells you exactly which stages *this* video needs: whether it needs a storyboard, whether visuals must be time-aligned to the narration, whether the speech has to be trimmed first, and where a human has to sign off before anything paid or irreversible happens.

繁體中文說明：[README.zh-TW.md](README.zh-TW.md)　·　完整流程文件：[docs/WORKFLOWS.md](docs/WORKFLOWS.md)

## Why

Video pipelines differ far more than they look. A code-drawn Remotion piece needs no storyboard and no narration alignment. A hand-drawn story pipeline needs both, plus a fuzzy-match pass to correct durations an upstream tool only guessed at from text. A generated-B-roll pipeline needs a character sheet, a continuity contract and a paid API budget.

Written as prose, those differences have to be inferred, and inference drifts. Here they live in a machine-readable registry, and every document is generated from it.

## Install

```bash
git clone <this repo> && cd video-flow
npm link           # or just use: npx video-flow <command>
video-flow doctor  # which methods can this machine actually run?
```

Node 22+ and FFmpeg are the baseline. Individual methods declare their own extra requirements (`auto-editor`, `python3`, API keys); `doctor` reports what's missing per method.

## Use

```bash
video-flow intake                      # guided Q&A → production/<project>/brief.json
video-flow scaffold <project>          # generate the method's project skeleton
video-flow plan <project>              # which stages this video needs, and what's next
video-flow done <project> <stage> --approved-by "name"
video-flow qa <project> out/final.mp4  # spec checks + review stills + contact sheet
video-flow doctor --project <project>  # can this project actually render?
video-flow validate                    # registry structure and cross-references
```

`done` refuses to close a stage whose declared outputs don't exist on disk, and refuses
a human-gated stage without `--approved-by`. Both are overridable with `--force`, and
the override is recorded in `brief.json`.

An agent that already asked the user these questions in conversation skips the prompts entirely:

```bash
video-flow intake --project my-video \
  --input talking-head-video --aspect 9:16 --method M4 \
  --voice human --captions designed --bgm library
```

Every command takes `--json`.

## How method selection works

The first two questions — what you're supplying, and where it will be watched — narrow the field before you choose. Nothing is hidden silently; ruled-out methods are listed with the reason.

Viewing context maps to a canvas: portrait 1080×1920, landscape 1920×1080, square, vertical feed, or **`custom`**, which prompts for width and height (and warns on odd dimensions, which H.264 rejects). Only code-drawn methods offer `custom` — a generated-image pipeline can't honour an arbitrary canvas without regenerating its assets.

```
$ video-flow methods --input talking-head-video --aspect 16:9

available (5/8)
M1  Remotion Native          9:16 16:9 1:1 4:5   no API cost
M2  GBRO Collage + Omni      9:16 1:1 4:5 16:9   per-asset     GEMINI_API_KEY
M6  Seedance 2.0 Fast        9:16 16:9 1:1       per-second    OPENROUTER_API_KEY
M7  HyperFrames + Remotion   9:16 16:9 1:1 4:5   no API cost
M8  Program Graphics         9:16 16:9 1:1 4:5   no API cost

ruled out (3)
✗ M3  input not accepted; 16:9 unsupported (inherits source aspect only)
✗ M4  16:9 unsupported (supports 9:16, 3:4)
✗ M5  16:9 unsupported (supports 9:16, 3:4)
```

## The stage matrix

Fourteen stages, eight methods. `●` required · `◆` locked by the upstream skill · `○` optional · `·` not needed.

| Stage | Gate | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Intake | ⏸ | ● | ● | ● | ● | ● | ● | ● | ● |
| Source prep | | ● | ● | ● | ● | ● | ● | ● | ● |
| Speech edit (auto-editor) | ⏸ | ● | ● | · | ● | ● | ● | ● | ● |
| Transcribe | | ● | ● | · | ● | ● | ● | ● | ● |
| Caption correction | ⏸ | ● | ● | · | ● | ● | ● | ● | ● |
| Timeline lock | | ● | ● | · | ● | ● | ● | ● | ● |
| Storyboard | ⏸ | ○ | ● | · | ● | ● | ● | ○ | ● |
| Visual design lock | ⏸ | ○ | ● | ● | ◆ | ◆ | ● | ● | ● |
| Asset generation | ⏸ | · | ● | ● | ● | ● | ● | · | ○ |
| Narration alignment | | · | ● | · | ● | ● | ● | ● | ● |
| Assemble | | ● | ● | ○ | ● | ● | ● | ● | ● |
| Render | | ● | ● | ● | ● | ● | ● | ● | ● |
| QA | ⏸ | ● | ● | ● | ● | ● | ● | ● | ● |
| Deliver | | ● | ● | ● | ● | ● | ● | ● | ● |

⏸ marks a human gate. `video-flow done` refuses to close one without `--approved-by`, so an agent cannot quietly pass a checkpoint the user never saw.

| | Method |
| --- | --- |
| M1 | Remotion Native — everything drawn in code |
| M2 | GBRO collage + Gemini Omni + Remotion |
| M3 | Gemini Omni direct clip edit |
| M4 | Hand-drawn diary comic + floating live-action avatar |
| M5 | Hand-drawn line-art reveal (HyperFrames) |
| M6 | Seedance 2.0 Fast B-roll (OpenRouter) + Remotion |
| M7 | HyperFrames + Remotion |
| M8 | Program Graphics — progressive information choreography |

## Two rules the pipeline enforces

**Speech drives the timeline, never the reverse.** Raw narration is trimmed with `auto-editor` before anything is measured. Every duration downstream — caption timings, scene cuts, `durationInFrames`, the delivered standalone narration — derives from the edited file. Visuals are never stretched to fit a layout decided in advance.

**Estimated durations are drafts.** When an upstream tool returns scene durations it guessed from text, they get replaced by fuzzy-matching each segment's narration against the corrected captions, using a monotonic cursor so a repeated phrase elsewhere in the script can't steal the match.

A method can override how a stage works when the shared definition doesn't fit. M8 has no upstream tool guessing at durations, so its *Narration alignment* is redefined as **cue alignment**: locate each beat's trigger keyword in the captions and reveal on that word. Different name, different output file (`programBeats.ts`, not `segments.ts`), different rules — same stage slot. `video-flow plan` shows whichever applies.

## Layout

```
flow/registry/     stages.json · methods.json · questions.json   ← single source of truth
flow/cli/          the video-flow command
docs/WORKFLOWS.md  generated — run `video-flow docs` after editing the registry
examples/          de-identified sample projects
production/        your own work (gitignored)
```

```bash
npm run check   # validate + test + docs:check
```

`docs:check` fails when the generated docs have drifted from the registry, and
`validate` catches registry mistakes — a method that doesn't take a position on every
stage, a `default` aspect outside `supported`, a dangling guide path — before they
surface as confusing CLI behaviour.

## Adding a method

Add an entry to `flow/registry/methods.json` with its accepted inputs, supported aspect ratios, requirements, and a status for all fourteen stages. Run `video-flow docs`. Intake, filtering, planning, gating and documentation all pick it up — there is no second place to update.

## Licence

MIT. Bundled third-party assets and upstream skills keep their own licences; see each project's `CREDITS.md`.
