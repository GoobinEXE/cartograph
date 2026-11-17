/** In-memory Storage double shared by the test files (not picked up as a test: no `.test.ts`). */
export function createMemoryLocalStorage(initial: Record<string, string> = {}, failSet = false): Storage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      if (failSet) {
        throw new Error('QuotaExceededError');
      }
      map.set(key, value);
    },
  };
}
