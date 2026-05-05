import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { buildSearchFilter, fuzzyScore, expandQuery } from '@/lib/search-utils';

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

const SearchBar = ({ className, placeholder = "Search products...", isMobile = false }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch suggestions with debounce - searches database products
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const escapedQuery = searchQuery.replace(/[%_]/g, '\\$&');
      
      // Search products
      const { data: products, error: prodError } = await supabase
        .from('public_products')
        .select('id, name, category, image_url, retail_price')
        .or(`name.ilike.%${escapedQuery}%,category.ilike.%${escapedQuery}%,subcategory.ilike.%${escapedQuery}%`)
        .limit(6);

      // Search categories
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug')
        .ilike('name', `%${escapedQuery}%`)
        .eq('is_active', true)
        .limit(3);

      const results: Suggestion[] = [];
      
      // Add category matches first
      if (!catError && categories) {
        categories.forEach(cat => {
          results.push({ ...cat, type: 'category' });
        });
      }
      
      // Add product matches
      if (!prodError && products) {
        products.forEach(prod => {
          results.push({ ...prod, type: 'product' });
        });
      }

      setSuggestions(results);
    } catch (err) {
      console.error('Search error:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchSuggestions]);

  // Real-time subscription for product updates
  useEffect(() => {
    const channel = supabase
      .channel('products-search')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          // Refetch suggestions when products change
          if (query.trim().length >= 2) {
            fetchSuggestions(query);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query, fetchSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Blur input to hide keyboard on mobile
      inputRef.current?.blur();
      setShowSuggestions(false);
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    inputRef.current?.blur();
    setShowSuggestions(false);
    setQuery('');
    if (suggestion.type === 'category') {
      navigate(`/products?category=${(suggestion as CategorySuggestion).slug}`);
    } else {
      navigate(`/product/${suggestion.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          handleSuggestionClick(suggestions[selectedIndex]);
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
    inputRef.current?.focus();
  };

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
              isMobile && "text-sm"
            )}
            autoComplete="off"
            enterKeyHint="search"
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && (query.length >= 2 || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="py-1">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.type}-${suggestion.id}`}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors text-left",
                      selectedIndex === index && "bg-muted"
                    )}
                  >
                    <div className="w-10 h-10 rounded-md bg-muted overflow-hidden flex-shrink-0">
                      {suggestion.type === 'product' && suggestion.image_url ? (
                        <img
                          src={suggestion.image_url}
                          alt={suggestion.name}
                          className="w-full h-full object-cover"
                        />
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
                      <span className="text-sm font-semibold text-primary">
                        Ksh {suggestion.retail_price}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : query.length >= 2 ? (
            <div className="py-4 text-center text-muted-foreground text-sm">
              No products found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
