import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, Sparkles, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { buildSearchFilter, fuzzyScore, expandQuery } from '@/lib/search-utils';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  getTrendingSearches,
} from '@/lib/search-history';

interface ProductSuggestion {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  retail_price: number;
  type: 'product';
}

interface CategorySuggestion {
  id: string;
  name: string;
  slug: string;
  type: 'category';
}

type Suggestion = ProductSuggestion | CategorySuggestion;

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  isMobile?: boolean;
}

const SearchBar = ({ className, placeholder = "Search inventory...", isMobile = false }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load recent + trending whenever dropdown opens
  useEffect(() => {
    if (showSuggestions) {
      setRecent(getRecentSearches());
      setTrending(getTrendingSearches());
    }
  }, [showSuggestions]);

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setDidYouMean(null);
      return;
    }

    setIsLoading(true);
    try {
      const filterStr = buildSearchFilter(searchQuery);

      const { data: products, error: prodError } = await supabase
        .from('public_products')
        .select('id, name, category, image_url, retail_price, search_tags')
        .or(filterStr)
        .limit(12);

      const expanded = expandQuery(searchQuery);
      const catFilter = expanded.map(t => `name.ilike.%${t.replace(/[%_]/g, '\\$&')}%`).join(',');
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug')
        .or(catFilter)
        .eq('is_active', true)
        .limit(3);

      const results: Suggestion[] = [];

      if (!catError && categories) {
        categories.forEach(cat => results.push({ ...cat, type: 'category' }));
      }

      let bestScore = 0;
      let bestName = '';
      if (!prodError && products) {
        const scored = products.map(prod => {
          const score = Math.max(
            fuzzyScore(searchQuery, prod.name),
            fuzzyScore(searchQuery, prod.search_tags || ''),
          );
          if (score > bestScore) { bestScore = score; bestName = prod.name; }
          return { ...prod, type: 'product' as const, score };
        });
        scored.sort((a, b) => b.score - a.score);
        scored.slice(0, 8).forEach(prod => results.push(prod));
      }

      setSuggestions(results);

      // "Did you mean" — fuzzy correction when query doesn't appear directly
      const lower = searchQuery.toLowerCase();
      if (bestName && bestScore < 100 && !bestName.toLowerCase().includes(lower)) {
        // Pick the closest single word from the best name
        const firstWord = bestName.split(/\s+/).find(w => w.length >= 3) || bestName;
        if (firstWord.toLowerCase() !== lower) setDidYouMean(firstWord);
        else setDidYouMean(null);
      } else {
        setDidYouMean(null);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSuggestions([]);
      setDidYouMean(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchSuggestions]);

  // Real-time refetch when products change
  useEffect(() => {
    const channel = supabase
      .channel('products-search')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        if (query.trim().length >= 2) fetchSuggestions(query);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [query, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const submitSearch = (term: string) => {
    const t = term.trim();
    if (!t) return;
    addRecentSearch(t);
    inputRef.current?.blur();
    setShowSuggestions(false);
    setQuery('');
    navigate(`/products?search=${encodeURIComponent(t)}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch(query);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    addRecentSearch(suggestion.name);
    inputRef.current?.blur();
    setShowSuggestions(false);
    setQuery('');
    if (suggestion.type === 'category') {
      navigate(`/products?category=${(suggestion as CategorySuggestion).slug}`);
    } else {
      navigate(`/product/${suggestion.id}`);
    }
  };

  // Flat list for keyboard navigation
  const idleItems = useMemo(() => (
    [...recent.map(t => ({ kind: 'recent' as const, term: t })),
     ...trending.map(t => ({ kind: 'trending' as const, term: t }))]
  ), [recent, trending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const list = query.length >= 2 ? suggestions : idleItems;
    if (!showSuggestions || list.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < list.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : list.length - 1));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < list.length) {
          e.preventDefault();
          if (query.length >= 2) handleSuggestionClick(suggestions[selectedIndex]);
          else submitSearch(idleItems[selectedIndex].term);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  };

  const clearQuery = () => {
    setQuery('');
    setSuggestions([]);
    setDidYouMean(null);
    inputRef.current?.focus();
  };

  const showIdle = query.length < 2 && !isLoading && (recent.length > 0 || trending.length > 0);
  const showResults = query.length >= 2 || isLoading;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className={cn(
              "pl-10 pr-10 bg-muted/50 border-border/50 focus:bg-muted",
              isMobile && "text-sm",
            )}
            autoComplete="off"
            enterKeyHint="search"
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {showSuggestions && (showResults || showIdle) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[28rem] overflow-y-auto">
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Search results */}
          {!isLoading && showResults && (
            <>
              {expandQuery(query).length > 1 && (
                <div className="px-4 py-1.5 bg-primary/5 border-b border-border flex items-center gap-1.5 text-xs text-primary">
                  <Sparkles className="w-3 h-3" />
                  <span>Smart search expanded your query</span>
                </div>
              )}

              {didYouMean && (
                <button
                  type="button"
                  onClick={() => { setQuery(didYouMean); }}
                  className="w-full px-4 py-2 text-left text-xs flex items-center gap-1.5 bg-accent/30 border-b border-border hover:bg-accent/50"
                >
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">Did you mean</span>
                  <span className="font-semibold text-primary">{didYouMean}</span>
                  <span className="text-muted-foreground">?</span>
                </button>
              )}

              {suggestions.length > 0 ? (
                <ul className="py-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={`${suggestion.type}-${suggestion.id}`}>
                      <button
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors text-left",
                          selectedIndex === index && "bg-muted",
                        )}
                      >
                        <div className="w-10 h-10 rounded-md bg-muted overflow-hidden flex-shrink-0">
                          {suggestion.type === 'product' && suggestion.image_url ? (
                            <img src={suggestion.image_url} alt={suggestion.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Search className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{suggestion.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.type === 'category' ? 'Category' : suggestion.category}
                          </p>
                        </div>
                        {suggestion.type === 'product' && (
                          <span className="text-sm font-semibold text-primary">Ksh {suggestion.retail_price}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : !didYouMean && query.length >= 2 ? (
                <div className="py-4 text-center text-muted-foreground text-sm">
                  No inventory found for "{query}"
                </div>
              ) : null}
            </>
          )}

          {/* Idle: recent + trending */}
          {!isLoading && showIdle && (
            <div className="py-1">
              {recent.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Recent</span>
                    <button
                      type="button"
                      onClick={() => { clearRecentSearches(); setRecent([]); }}
                      className="hover:text-foreground normal-case tracking-normal"
                    >
                      Clear
                    </button>
                  </div>
                  <ul>
                    {recent.map((term, i) => {
                      const idx = i;
                      return (
                        <li key={`r-${term}`} className="group">
                          <div
                            className={cn(
                              "w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/50 transition-colors",
                              selectedIndex === idx && "bg-muted",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => submitSearch(term)}
                              className="flex-1 flex items-center gap-2 text-left text-sm"
                            >
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="truncate">{term}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeRecentSearch(term); setRecent(getRecentSearches()); }}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                              aria-label="Remove"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {trending.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" /> Trending
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                    {trending.map(term => (
                      <button
                        key={`t-${term}`}
                        type="button"
                        onClick={() => submitSearch(term)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
                      >
                        {term}
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
