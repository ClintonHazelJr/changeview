import { useEffect, useState } from 'react';
import {
  ANNUAL_SAVE_LABEL,
  FALLBACK_PLAN_PRICES,
} from '../../shared/planPrices.js';

let memoryCache = null;
let inflight = null;

async function loadPlanPrices() {
  if (memoryCache) return memoryCache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch('/api/plan-prices');
      if (!res.ok) throw new Error(`plan-prices ${res.status}`);
      const data = await res.json();
      if (!data?.plans) throw new Error('Invalid plan-prices payload');
      memoryCache = {
        plans: data.plans,
        source: data.source || 'stripe',
        annualSaveLabel: data.annualSaveLabel || ANNUAL_SAVE_LABEL,
        currency: data.currency || 'usd',
      };
      return memoryCache;
    } catch (err) {
      console.warn('[usePlanPrices] falling back to local catalog', err.message);
      memoryCache = {
        plans: FALLBACK_PLAN_PRICES,
        source: 'fallback',
        annualSaveLabel: ANNUAL_SAVE_LABEL,
        currency: 'usd',
      };
      return memoryCache;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Shared display prices: Stripe-backed when /api/plan-prices is available. */
export function usePlanPrices() {
  const [state, setState] = useState(() => memoryCache || {
    plans: FALLBACK_PLAN_PRICES,
    source: 'fallback',
    annualSaveLabel: ANNUAL_SAVE_LABEL,
    currency: 'usd',
    loading: !memoryCache,
  });

  useEffect(() => {
    let cancelled = false;
    loadPlanPrices().then((catalog) => {
      if (cancelled) return;
      setState({ ...catalog, loading: false });
    });
    return () => { cancelled = true; };
  }, []);

  return state;
}
