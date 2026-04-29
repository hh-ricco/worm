export type ToolId = 'food' | 'danger' | 'temperature' | 'light';
export type ToolState = 'locked' | 'idle' | 'active';

export const TOOL_IDS: readonly ToolId[] = [
  'food',
  'danger',
  'temperature',
  'light',
] as const;

const TOOL_LABELS: Record<ToolId, string> = {
  food: '食物',
  danger: '危险',
  temperature: '温度',
  light: '光照',
};

export interface ToolController {
  unlock(id: ToolId): void;
  unlockAll(): void;
  select(id: ToolId): void;
  deselect(): void;
  getState(id: ToolId): ToolState;
  getActive(): ToolId | null;
  onChange(cb: (id: ToolId, state: ToolState) => void): () => void;
  onUnlock(cb: (id: ToolId) => void): () => void;
}

export function createToolController(
  buttons: Map<ToolId, HTMLButtonElement>,
): ToolController {
  const states = new Map<ToolId, ToolState>(
    TOOL_IDS.map((id) => [id, 'locked']),
  );
  let active: ToolId | null = null;
  const listeners = new Set<(id: ToolId, state: ToolState) => void>();
  const unlockListeners = new Set<(id: ToolId) => void>();

  function applyToButton(id: ToolId): void {
    const btn = buttons.get(id);
    if (!btn) return;
    const state = states.get(id)!;
    btn.dataset.state = state;
    btn.classList.toggle('locked', state === 'locked');
    btn.disabled = state === 'locked';

    const suffix =
      state === 'locked'
        ? '（未解锁）'
        : state === 'active'
          ? '（已选中）'
          : '';
    btn.setAttribute('aria-label', `${TOOL_LABELS[id]}${suffix}`);
  }

  function setState(id: ToolId, state: ToolState): void {
    states.set(id, state);
    applyToButton(id);
    listeners.forEach((cb) => cb(id, state));
  }

  function unlock(id: ToolId): void {
    if (states.get(id) !== 'locked') return;
    setState(id, 'idle');
    const btn = buttons.get(id);
    if (btn) {
      btn.classList.add('unlocking');
      window.setTimeout(() => btn.classList.remove('unlocking'), 1100);
    }
    unlockListeners.forEach((cb) => cb(id));
  }

  function unlockAll(): void {
    TOOL_IDS.forEach(unlock);
  }

  function deselect(): void {
    if (active !== null) {
      const prev = active;
      active = null;
      setState(prev, 'idle');
    }
  }

  function select(id: ToolId): void {
    const state = states.get(id);
    if (state === 'locked') return;
    if (active === id) {
      deselect();
      return;
    }
    deselect();
    active = id;
    setState(id, 'active');
  }

  buttons.forEach((btn, id) => {
    btn.addEventListener('click', () => {
      if (states.get(id) !== 'locked') select(id);
    });
    applyToButton(id);
  });

  return {
    unlock,
    unlockAll,
    select,
    deselect,
    getState: (id) => states.get(id)!,
    getActive: () => active,
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    onUnlock(cb) {
      unlockListeners.add(cb);
      return () => {
        unlockListeners.delete(cb);
      };
    },
  };
}
