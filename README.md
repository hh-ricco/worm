# Worm

An interactive explorable about *C. elegans*, valence, and the origin of reward signals in AI.

The first work in the [CogLink](../) series — a personal-portfolio site of explorables about minds, intelligence, and thinking.

## Status

**v0.1 — scaffold only.** The petri dish renders, a placeholder worm wanders. UI panels (tools, spike train, narrative) are static. No interactions yet.

## Run locally

Requires Node 20+ (or whatever the latest LTS is).

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

```bash
npm run build      # production build → dist/
npm run preview    # preview the production build
npm run typecheck  # tsc strict check
```

## Project structure

```
src/
├── main.ts            # entry: wires sim + render
├── helpers.ts         # small utilities (random, vec math, easing, $)
├── pubsub.ts          # 30-line event bus
├── sim/               # pure simulation (no DOM, no PixiJS)
│   └── worm.ts
├── render/            # PixiJS stage and graphics
│   └── stage.ts
├── state/             # scene/chapter machine
│   └── scenes.ts
├── content/           # narrative scripts (markdown)
│   └── narrative.zh.md
├── ui/                # DOM panels (future)
└── i18n/              # language switching (future)
```

The `sim/` and `render/` layers are kept strictly separate. The simulation is plain TypeScript with no rendering dependencies — it can be unit-tested or moved to a worker without changes.

## Design references

- [docs/KEYFRAME_2_BRIEF.md](docs/KEYFRAME_2_BRIEF.md) — visual spec for chapter 1 screen
- [docs/wireframe.html](docs/wireframe.html) — layout wireframe (open in browser)
- [docs/DESIGN.md](docs/DESIGN.md) — implementation notes

## License

- Code: MIT — see [LICENSE](LICENSE)
- Content (narrative, art): CC BY-SA 4.0
