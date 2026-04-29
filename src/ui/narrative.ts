import type { NarrativeBeat } from '../content/chapter1';

export interface NarrativeController {
  update(elapsedSec: number): void;
  advance(): void;
  isAtLast(): boolean;
}

const FADE_MS = 250;

export function createNarrative(
  el: HTMLElement,
  beats: NarrativeBeat[],
): NarrativeController {
  let shownIndex = -1;
  let manualIndex = -1;
  let fadeTimer: number | null = null;

  function show(text: string, fade: boolean): void {
    if (fadeTimer !== null) {
      window.clearTimeout(fadeTimer);
      fadeTimer = null;
    }
    if (!fade) {
      el.textContent = text;
      el.style.opacity = '1';
      return;
    }
    el.style.opacity = '0';
    fadeTimer = window.setTimeout(() => {
      el.textContent = text;
      el.style.opacity = '1';
      fadeTimer = null;
    }, FADE_MS);
  }

  function applyIndex(idx: number): void {
    if (idx === -1 || idx === shownIndex) return;
    show(beats[idx].text, shownIndex !== -1);
    shownIndex = idx;
  }

  return {
    update(elapsedSec: number) {
      let timeIdx = -1;
      for (let i = 0; i < beats.length; i++) {
        if (beats[i].t <= elapsedSec) timeIdx = i;
        else break;
      }
      // Whichever is further ahead wins — click can fast-forward, time can catch up later
      applyIndex(Math.max(timeIdx, manualIndex));
    },
    advance() {
      const next = Math.min(beats.length - 1, shownIndex + 1);
      manualIndex = next;
      applyIndex(next);
    },
    isAtLast() {
      return shownIndex === beats.length - 1;
    },
  };
}
