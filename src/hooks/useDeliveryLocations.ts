import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DELIVERY_LOCATIONS as FALLBACK_LOCATIONS,
  type DeliveryLocation,
} from '@/data/deliveryLocations';

export type { DeliveryLocation };

export interface DeliveryQuote {
  /** Location name shown to the customer. */
  name: string;
  region: string;
  /** Standard fee for the location. */
  baseFee: number;
  /** Fee after any waiver. */
  fee: number;
  waiverApplied: boolean;
  /** Amount still needed to unlock the waiver (0 if none / already met). */
  amountToWaiver: number;
  waiverThreshold: number | null;
  waiverFee: number;
  /** True when the location is unknown or its fee is missing — fee arranged with driver. */
  isFallback: boolean;
  warning?: string;
}

const safeNum = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * Live delivery locations + admin-managed prices.
 * Falls back to the bundled baseline list if the table is unreachable,
 * so checkout never blocks on a network hiccup.
 */
export const useDeliveryLocations = () => {
  const [locations, setLocations] = useState<DeliveryLocation[]>(FALLBACK_LOCATIONS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_locations')
        .select('code, name, region, price, is_active, display_order, waiver_threshold, waiver_fee')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setLocations(
          data.map((row) => ({
            id: row.code,
            name: row.name || row.code,
            region: row.region || '',
            price: safeNum(row.price) ?? NaN,
            waiverThreshold: safeNum(row.waiver_threshold),
            waiverFee: safeNum(row.waiver_fee) ?? 0,
          })),
        );
      }
      setLoadError(null);
    } catch (e) {
      console.warn('Delivery locations unavailable, using baseline list', e);
      setLoadError('Live delivery prices are unavailable — showing standard rates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('delivery-locations-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_locations' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const find = useCallback(
    (id: string) => locations.find((l) => l.id === id),
    [locations],
  );

  /** Never throws: always returns a usable quote. */
  const quote = useCallback(
    (id: string, subtotal: number): DeliveryQuote => {
      const loc = id ? locations.find((l) => l.id === id) : undefined;
      if (!loc) {
        return {
          name: id || 'Not selected', region: '', baseFee: 0, fee: 0, waiverApplied: false,
          amountToWaiver: 0, waiverThreshold: null, waiverFee: 0, isFallback: true,
          warning: id ? 'This location isn’t on our list — the fee will be agreed with the driver.' : 'Choose a delivery location.',
        };
      }
      if (!Number.isFinite(loc.price)) {
        return {
          name: loc.name, region: loc.region, baseFee: 0, fee: 0, waiverApplied: false,
          amountToWaiver: 0, waiverThreshold: null, waiverFee: 0, isFallback: true,
          warning: 'No fee is set for this location yet — the fee will be agreed with the driver.',
        };
      }
      const threshold = loc.waiverThreshold ?? null;
      const waiverFee = Math.min(loc.waiverFee ?? 0, loc.price);
      const met = threshold !== null && subtotal >= threshold;
      return {
        name: loc.name, region: loc.region, baseFee: loc.price,
        fee: met ? waiverFee : loc.price,
        waiverApplied: met && waiverFee < loc.price,
        amountToWaiver: threshold !== null && !met && waiverFee < loc.price ? Math.max(0, threshold - subtotal) : 0,
        waiverThreshold: threshold, waiverFee, isFallback: false,
      };
    },
    [locations],
  );

  const search = useCallback(
    (query: string, limit = 8): DeliveryLocation[] => {
      const q = query.trim().toLowerCase();
      if (!q) return locations.slice(0, limit);
      const startsWith: DeliveryLocation[] = [];
      const includes: DeliveryLocation[] = [];
      for (const loc of locations) {
        const name = loc.name.toLowerCase();
        const region = loc.region.toLowerCase();
        if (name.startsWith(q) || region.startsWith(q)) startsWith.push(loc);
        else if (name.includes(q) || region.includes(q)) includes.push(loc);
        if (startsWith.length + includes.length >= limit * 2) break;
      }
      return [...startsWith, ...includes].slice(0, limit);
    },
    [locations],
  );

  return useMemo(
    () => ({ locations, loading, loadError, find, quote, search, reload: load }),
    [locations, loading, loadError, find, quote, search, load],
  );
};

export default useDeliveryLocations;
