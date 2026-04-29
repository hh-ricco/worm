# Worm — Design

## Quick refs

- **Visual brief**: [./KEYFRAME_2_BRIEF.md](./KEYFRAME_2_BRIEF.md)
- **Wireframe**: [./wireframe.html](./wireframe.html)

## v0.1 scope

Scaffold only. Verifies tech stack works end-to-end:

- Vite + TypeScript build pipeline
- PixiJS v8 renders into a DOM-managed petri dish
- Simulation/render separation (worm sim is pure TS, no rendering dependencies)
- Static DOM panels for tools, spike channels, and narrative match the wireframe layout

## v0.2 plans

- Replace placeholder worm with the SVG drawing
- Implement AVB rate-coding spike train (Poisson sampling + scrolling render)
- Add Geiger-counter audio (one click per spike, optional)
- Wire chapter 1 → 2 transition: unlock food tool + AWC channel

## Sources

Each scientific claim rendered to the player must be traceable. See `SOURCES.md` (TODO).
