export interface RateState {
  hits: Map<string, number[]>;
}

export function createRateState(): RateState {
  return { hits: new Map() };
}

export function rateExceeded(
  state: RateState,
  key: string,
  windowMs: number,
  max: number,
  now = Date.now()
): boolean {
  const cutoff = now - windowMs;
  const arr = (state.hits.get(key) ?? []).filter((t) => t > cutoff);
  arr.push(now);
  state.hits.set(key, arr);
  if (state.hits.size > 10_000) {
    for (const [k, v] of state.hits) {
      if (v.every((t) => t <= cutoff)) state.hits.delete(k);
    }
  }
  return arr.length > max;
}
