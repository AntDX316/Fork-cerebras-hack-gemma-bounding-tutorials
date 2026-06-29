import { clientCount } from "./client";

/**
 * Bounded-concurrency fan-out that round-robins work across the API-key pool.
 * Each worker is handed a clientIndex so concurrent calls spread across keys.
 */
export async function fanout<T, R>(
  items: T[],
  worker: (item: T, clientIndex: number, index: number) => Promise<R>,
  concurrency?: number,
): Promise<R[]> {
  const n = items.length;
  const results = new Array<R>(n);
  if (n === 0) return results;

  const keys = clientCount();
  const limit = Math.max(1, concurrency ?? Math.min(8, Math.max(keys * 2, 4)));

  let next = 0;
  async function run(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= n) return;
      results[i] = await worker(items[i], i % keys, i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, n) }, () => run()));
  return results;
}
