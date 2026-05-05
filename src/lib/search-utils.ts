// Swahili → English keyword mapping for multi-language search
const KEYWORD_MAP: Record<string, string[]> = {
  // Hair
  'nywele': ['hair', 'braid', 'extension', 'weave', 'wig'],
  'mafuta': ['oil', 'cream', 'lotion', 'moisturizer', 'pomade'],
  'mafuta ya nywele': ['hair oil', 'hair food', 'hair treatment'],
  'rangi': ['colour', 'color', 'dye', 'tint'],
  'urembo': ['beauty', 'cosmetic', 'makeup'],
  'manukato': ['perfume', 'fragrance', 'scent', 'cologne'],
  'sabuni': ['soap', 'cleanser', 'wash', 'body wash'],
  'mafuta ya mwili': ['body oil', 'body lotion', 'body cream'],
  'midomo': ['lip', 'lipstick', 'lip gloss', 'lip balm'],
  'kucha': ['nail', 'nail polish', 'manicure'],
  'ngozi': ['skin', 'skincare', 'face cream', 'body lotion'],
  'nywele bandia': ['extension', 'braid', 'weave', 'wig', 'crochet'],
  'shampoo': ['shampoo'],
  'conditioner': ['conditioner'],
  'dawa ya nywele': ['hair treatment', 'hair mask', 'deep conditioner'],
  'harufu nzuri': ['fragrance', 'perfume', 'scent', 'deodorant'],
  'deodorant': ['deodorant', 'roll-on', 'antiperspirant'],
  'lotion': ['lotion', 'cream', 'moisturizer'],
  'cream': ['cream', 'lotion', 'moisturizer'],
  'glycerine': ['glycerine', 'glycerin'],
  'uzi': ['yarn', 'knitting', 'thread', 'wool'],
  'uzi wa kushona': ['knitting yarn', 'wool', 'thread'],
};

/**
 * Expand a search query using Swahili keyword mapping.
 * Returns an array of expanded search terms.
 */
export function expandQuery(query: string): string[] {
  const lower = query.toLowerCase().trim();
  const terms = [lower];

  // Check multi-word matches first (longer keys first)
  const sortedKeys = Object.keys(KEYWORD_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      terms.push(...KEYWORD_MAP[key]);
    }
  }

  // Check individual words
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (KEYWORD_MAP[word]) {
      terms.push(...KEYWORD_MAP[word]);
    }
  }

  return [...new Set(terms)];
}

/**
 * Simple Levenshtein distance for fuzzy matching
 */
function levenshtein(a: string, b: string): number {
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  const dp: number[][] = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[la][lb];
}

/**
 * Fuzzy match score: 0 = no match, higher = better match.
 * Handles typo correction by checking substrings and edit distance.
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact substring match
  if (t.includes(q)) return 100;

  // Word-level matching
  const qWords = q.split(/\s+/).filter(Boolean);
  const tWords = t.split(/\s+/).filter(Boolean);

  let matchedWords = 0;
  for (const qw of qWords) {
    // Direct substring in target
    if (t.includes(qw)) {
      matchedWords += 2;
      continue;
    }
    // Fuzzy match against each target word
    for (const tw of tWords) {
      const dist = levenshtein(qw, tw);
      const maxLen = Math.max(qw.length, tw.length);
      if (maxLen > 0 && dist / maxLen <= 0.35) {
        matchedWords += 1;
        break;
      }
    }
  }

  if (matchedWords === 0) return 0;
  return Math.round((matchedWords / (qWords.length * 2)) * 80);
}

/**
 * Build fuzzy OR clause for Supabase search.
 * Returns an ilike filter string for use with .or()
 */
export function buildSearchFilter(query: string): string {
  const expanded = expandQuery(query);
  const filters: string[] = [];

  for (const term of expanded) {
    const escaped = term.replace(/[%_]/g, '\\$&');
    filters.push(`name.ilike.%${escaped}%`);
    filters.push(`category.ilike.%${escaped}%`);
    filters.push(`subcategory.ilike.%${escaped}%`);
    filters.push(`search_tags.ilike.%${escaped}%`);
  }

  return filters.join(',');
}
