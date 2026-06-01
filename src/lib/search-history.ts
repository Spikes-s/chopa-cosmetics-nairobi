// Search history helpers — localStorage backed with optional cloud sync per signed-in user
import { supabase } from '@/integrations/supabase/client';

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

function getTrendingRaw(): TrendingEntry[] {
  if (typeof window === 'undefined') return [];
  return safeParse<TrendingEntry[]>(localStorage.getItem(TRENDING_KEY), []);
}

export function addRecentSearch(term: string) {
  if (typeof window === 'undefined') return;
  const t = term.trim();
  if (t.length < 2) return;
  const list = getRecentSearches().filter(x => x.toLowerCase() !== t.toLowerCase());
  list.unshift(t);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_LIMIT)));
  bumpTrending(t);
  void scheduleCloudPush();
}

export function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RECENT_KEY);
  void scheduleCloudPush();
}

export function removeRecentSearch(term: string) {
  if (typeof window === 'undefined') return;
  const list = getRecentSearches().filter(x => x.toLowerCase() !== term.toLowerCase());
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  void scheduleCloudPush();
}

function bumpTrending(term: string) {
  const list = getTrendingRaw();
  const idx = list.findIndex(x => x.term.toLowerCase() === term.toLowerCase());
  if (idx >= 0) {
    list[idx].count += 1;
    list[idx].lastUsed = Date.now();
  } else {
    list.push({ term, count: 1, lastUsed: Date.now() });
  }
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const cleaned = list.filter(x => x.lastUsed > cutoff || x.count >= 3);
  localStorage.setItem(TRENDING_KEY, JSON.stringify(cleaned));
}

export function getTrendingSearches(): string[] {
  return getTrendingRaw()
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, TRENDING_LIMIT)
    .map(x => x.term);
}

// ---------- Cloud sync ----------

let activeUserId: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function mergeRecent(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...a, ...b]) {
    const k = t.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(t); }
  }
  return out.slice(0, RECENT_LIMIT);
}

function mergeTrending(a: TrendingEntry[], b: TrendingEntry[]): TrendingEntry[] {
  const map = new Map<string, TrendingEntry>();
  for (const e of [...a, ...b]) {
    const k = e.term.toLowerCase();
    const existing = map.get(k);
    if (existing) {
      existing.count = Math.max(existing.count, e.count);
      existing.lastUsed = Math.max(existing.lastUsed, e.lastUsed);
    } else {
      map.set(k, { ...e });
    }
  }
  return Array.from(map.values());
}

export async function pullCloudSearchHistory(userId: string) {
  activeUserId = userId;
  try {
    const { data, error } = await (supabase.from as any)('user_search_history')
      .select('recent, trending')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return;
    const cloudRecent: string[] = Array.isArray(data?.recent) ? data!.recent : [];
    const cloudTrending: TrendingEntry[] = Array.isArray(data?.trending) ? data!.trending : [];
    const mergedRecent = mergeRecent(getRecentSearches(), cloudRecent);
    const mergedTrending = mergeTrending(getTrendingRaw(), cloudTrending);
    localStorage.setItem(RECENT_KEY, JSON.stringify(mergedRecent));
    localStorage.setItem(TRENDING_KEY, JSON.stringify(mergedTrending));
    // Push merged result back so cloud reflects the union
    void pushCloudSearchHistory();
  } catch (e) {
    console.warn('Search history pull failed', e);
  }
}

export function clearActiveUser() {
  activeUserId = null;
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
}

function scheduleCloudPush() {
  if (!activeUserId) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { void pushCloudSearchHistory(); }, 1500);
}

async function pushCloudSearchHistory() {
  if (!activeUserId) return;
  try {
    await (supabase.from as any)('user_search_history').upsert({
      user_id: activeUserId,
      recent: getRecentSearches(),
      trending: getTrendingRaw(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch (e) {
    console.warn('Search history push failed', e);
  }
}
