import { useMemo, useState } from 'react';
import { Truck, Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DELIVERY_LOCATIONS,
  DeliveryLocation,
  searchLocations,
  findLocation,
} from '@/data/deliveryLocations';

// Re-export for backward compatibility with existing imports
export { DELIVERY_LOCATIONS };
export type { DeliveryLocation };

interface DeliveryLocationSelectProps {
  /** Location id OR the freeform text of a custom location. */
  value: string;
  onChange: (value: string) => void;
  /** Reserved for parent layouts; the pricing chip is intentionally quiet here. */
  hidePrice?: boolean;
}

/**
 * Google-style search combobox for delivery location.
 * - Type to filter — pick from suggestions to auto-fill.
 * - No matches → offer to save whatever the customer typed as their custom location.
 * - Selected value can be an existing location id OR a custom string.
 */
const DeliveryLocationSelect = ({ value, onChange }: DeliveryLocationSelectProps) => {
  const knownSelected = findLocation(value);
  const initialQuery = knownSelected?.name ?? value ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    if (!query.trim()) return DELIVERY_LOCATIONS.slice(0, 10);
    return searchLocations(query, 12);
  }, [query]);

  const trimmed = query.trim();
  const isCustom = !!trimmed && !suggestions.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());

  const pick = (loc: DeliveryLocation) => {
    setQuery(loc.name);
    onChange(loc.id);
    setOpen(false);
  };

  const useCustom = () => {
    if (!trimmed) return;
    onChange(trimmed); // freeform value stored verbatim
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search delivery location (e.g., Ruaka, Karen, Kisumu)…"
            className="pl-9"
            aria-label="Search delivery location"
            autoComplete="off"
          />
        </div>

        {open && (suggestions.length > 0 || isCustom) && (
          <div className="absolute left-0 right-0 mt-2 z-50 rounded-xl border border-border bg-popover shadow-xl max-h-72 overflow-y-auto">
            {suggestions.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(loc)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{loc.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{loc.region}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-accent shrink-0">
                  {loc.price === 0 ? 'Free' : `Ksh ${loc.price}`}
                </span>
              </button>
            ))}
            {isCustom && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={useCustom}
                className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-border hover:bg-primary/10 transition-colors text-left"
              >
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">
                  Use <span className="font-semibold">"{trimmed}"</span> as your delivery location
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selected chip */}
      {(knownSelected || (value && !knownSelected)) && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <Truck className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              Delivery to {knownSelected?.name || value}
            </p>
            {knownSelected && (
              <p className="text-xs text-muted-foreground">
                {knownSelected.region} · {knownSelected.price === 0 ? 'Free delivery' : `Ksh ${knownSelected.price}`}
              </p>
            )}
            {!knownSelected && (
              <p className="text-xs text-muted-foreground">Custom location — fee arranged with driver</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryLocationSelect;
