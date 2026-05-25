const KEYS = [
  'PrSQ1WYDFFWYxmAUiffp',
  'CFt8f5Oqw7f6WoReREMG',
  'NUpV6VHFz1V0tD8KlWGs',
  '5LUM1ux0fNPgjQCcl3YR',
  'aufveyVG2EJY8ulWfcwg',
];

export function getMaptilerKeys(): string[] {
  return KEYS;
}

export function getPrimaryKey(): string {
  return KEYS[0];
}

export async function tryMaptilerWithKeys<T>(
  fetchFn: (key: string) => Promise<T | null>
): Promise<T | null> {
  let lastError: Error | null = null;
  for (const key of KEYS) {
    try {
      const result = await fetchFn(key);
      if (result !== null) return result;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      // If rate limited (429) or any network error, try next key
      continue;
    }
  }
  if (lastError) throw lastError;
  return null;
}
