// Local storage helpers for recent + trending search terms
const RECENT_KEY = 'chopa_recent_searches';
const TRENDING_KEY = 'chopa_trending_searches';
const RECENT_LIMIT = 8;
const TRENDING_LIMIT = 6;

export interface TrendingEntry {
  term: string;
  count: number;
  lastUsed: number;
}

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
};

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  return safeParse<string[]>(localStorage.getItem(RECENT_KEY), []);
}

export function addRecentSearch(term: string) {
  if (typeof window === 'undefined') return;
  const t = term.trim();
  if (t.length < 2) return;
  const list = getRecentSearches().filter(x => x.toLowerCase() !== t.toLowerCase());
  list.unshift(t);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_LIMIT)));
  bumpTrending(t);
}

export function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RECENT_KEY);
}

export function removeRecentSearch(term: string) {
  if (typeof window === 'undefined') return;
  const list = getRecentSearches().filter(x => x.toLowerCase() !== term.toLowerCase());
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

function bumpTrending(term: string) {
  const list = safeParse<TrendingEntry[]>(localStorage.getItem(TRENDING_KEY), []);
  const idx = list.findIndex(x => x.term.toLowerCase() === term.toLowerCase());
  if (idx >= 0) {
    list[idx].count += 1;
    list[idx].lastUsed = Date.now();
  } else {
    list.push({ term, count: 1, lastUsed: Date.now() });
  }
  // Decay: drop entries older than 30 days with low count
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const cleaned = list.filter(x => x.lastUsed > cutoff || x.count >= 3);
  localStorage.setItem(TRENDING_KEY, JSON.stringify(cleaned));
}

export function getTrendingSearches(): string[] {
  if (typeof window === 'undefined') return [];
  const list = safeParse<TrendingEntry[]>(localStorage.getItem(TRENDING_KEY), []);
  return list
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, TRENDING_LIMIT)
    .map(x => x.term);
}
