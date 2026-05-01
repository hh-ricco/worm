import type { NarrativeBeat } from '../content/chapter1';

export interface NarrativeController {
  update(elapsedSec: number): void;
  advance(): void;
  isAtLast(): boolean;
  onAction(cb: (action: string) => void): () => void;
}

const FADE_MS = 250;

export function createNarrative(
  el: HTMLElement,
  beats: NarrativeBeat[],
): NarrativeController {
  let shownIndex = -1;
  let manualIndex = -1;
  let fadeTimer: number | null = null;
  const actionListeners = new Set<(action: string) => void>();
  const firedActions = new Set<string>();

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

  function fireBeatActions(idx: number): void {
    if (idx < 0 || idx >= beats.length) return;
    const action = beats[idx].action;
    if (action && !firedActions.has(action)) {
      firedActions.add(action);
      actionListeners.forEach((cb) => cb(action));
    }
  }

  function applyIndex(idx: number): void {
    if (idx === -1 || idx === shownIndex) return;
    show(beats[idx].text, shownIndex !== -1);
    shownIndex = idx;
    fireBeatActions(idx);
  }

  return {
    update(elapsedSec: number) {
      let timeIdx = -1;
      for (let i = 0; i < beats.length; i++) {
        if (beats[i].t <= elapsedSec) timeIdx = i;
        else break;
      }
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
    onAction(cb) {
      actionListeners.add(cb);
      return () => {
        actionListeners.delete(cb);
      };
    },
  };
}
