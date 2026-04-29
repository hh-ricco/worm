type Handler<T = unknown> = (payload: T) => void;

const channels = new Map<string, Set<Handler>>();

export function on<T = unknown>(
  channel: string,
  handler: Handler<T>,
): () => void {
  let set = channels.get(channel);
  if (!set) {
    set = new Set();
    channels.set(channel, set);
  }
  set.add(handler as Handler);
  return () => off(channel, handler);
}

export function off<T = unknown>(channel: string, handler: Handler<T>): void {
  channels.get(channel)?.delete(handler as Handler);
}

export function emit<T = unknown>(channel: string, payload: T): void {
  channels.get(channel)?.forEach((h) => (h as Handler<T>)(payload));
}

export function clear(channel?: string): void {
  if (channel) channels.delete(channel);
  else channels.clear();
}
