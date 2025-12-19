// lib/providers/openfoodfacts.ts
import type { Food } from "../../providers/MealsContext";
import { TEXT } from "../search/brands";

export type OFFProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name_en?: string;
  brands?: string;
  brands_tags?: string[];
  lc?: string;
  countries_tags_en?: string[];
  categories_tags_en?: string[];
  serving_size?: string;
  nutriments?: Record<string, any>;
};

const simplify = TEXT.simplify;

function firstNumber(...vals: Array<unknown>): number | null {
  for (const v of vals) {
    if (v == null) continue;
    const n = typeof v === "number" ? v : parseFloat(String(v));
    if (Number.isFinite(n)) return n;
  }
  return null;
}
const kJtoKcal = (kj: number | null) => (kj == null ? null : Math.round(kj / 4.184));
const gramsFromServing = (s?: string | null) => {
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  return m ? Math.round(parseFloat(m[1])) : null;
};

export function mapOFF(p: OFFProduct): Food | null {
  const n = p?.nutriments || {};
  const serving = p.serving_size || undefined;

  const kcalServing = firstNumber(n["energy-kcal_serving"], n["energy_kcal_serving"]);
  const kjServing = firstNumber(n["energy_serving"]);
  const kcal100 = firstNumber(n["energy-kcal_100g"], n["energy_kcal_100g"]);
  const kj100 = firstNumber(n["energy_100g"]);

  const perServing =
    kcalServing ?? (kjServing != null ? kJtoKcal(kjServing) : null);
  const per100 = kcal100 ?? (kj100 != null ? kJtoKcal(kj100) : null);

  let calories: number | null = null;
  if (perServing != null) calories = Math.round(perServing);
  else if (per100 != null) {
    const g = gramsFromServing(serving);
    calories = Math.round(g ? (per100 * g) / 100 : per100);
  }

  const macro = (key: string) => {
    const s = firstNumber(n[`${key}_serving`]);
    const p100 = firstNumber(n[`${key}_100g`]);
    if (s != null) return Math.round(s);
    if (p100 != null) {
      const g = gramsFromServing(serving);
      return Math.round(g ? (p100 * g) / 100 : p100);
    }
    return null;
  };

  const name = (p.product_name_en || p.product_name || p.generic_name_en || "Food").trim();
  if (!name || calories == null) return null;

  // Extract sugar and sodium
  const sugarServing = firstNumber(n["sugars_serving"], n["sugar_serving"]);
  const sugar100 = firstNumber(n["sugars_100g"], n["sugar_100g"]);
  let sugar: number | null = null;
  if (sugarServing != null) {
    sugar = Math.round(sugarServing);
  } else if (sugar100 != null) {
    const g = gramsFromServing(serving);
    sugar = Math.round(g ? (sugar100 * g) / 100 : sugar100);
  }

  // Sodium: can be in mg or g, with salt fallback (salt/2.5 = sodium)
  const sodiumServingRaw = firstNumber(n["sodium_serving"]);
  const sodium100Raw = firstNumber(n["sodium_100g"], n["sodium_100ml"]);
  const saltServing = firstNumber(n["salt_serving"]);
  const salt100 = firstNumber(n["salt_100g"], n["salt_100ml"]);
  
  console.log('🧂 [Sodium Extraction]', {
    name: (p.product_name_en || p.product_name || 'Unknown').substring(0, 30),
    sodiumServingRaw,
    sodium100Raw,
    saltServing,
    salt100,
    serving,
    nutrimentsKeys: Object.keys(n).filter(k => k.toLowerCase().includes('sod') || k.toLowerCase().includes('salt')),
  });
  
  let sodium: number | null = null;
  
  // Try sodium_serving first (usually in mg)
  if (sodiumServingRaw != null) {
    // If value is > 100, assume it's in mg, otherwise assume grams
    // DON'T round small values - keep them as decimals (e.g., 0.14g should stay 0.14, not become 0)
    if (sodiumServingRaw > 100) {
      // It's in mg, convert to grams and keep 3 decimal places
      sodium = Math.round((sodiumServingRaw / 1000) * 1000) / 1000;
    } else {
      // It's already in grams, keep as is (don't round to 0!)
      sodium = sodiumServingRaw;
    }
    console.log('✅ [Sodium] Using sodium_serving:', { sodiumServingRaw, sodium, assumedUnit: sodiumServingRaw > 100 ? 'mg' : 'g' });
  }
  // Try salt_serving as fallback
  else if (saltServing != null) {
    // Salt is usually in g, convert to sodium (salt/2.5 = sodium)
    // Keep decimal precision
    sodium = saltServing / 2.5;
    console.log('✅ [Sodium] Using salt_serving:', { saltServing, sodium, conversion: 'salt/2.5' });
  }
  // Try sodium_100g (usually in mg)
  else if (sodium100Raw != null) {
    const g = gramsFromServing(serving);
    if (g) {
      // If value is > 100, assume it's in mg per 100g
      const sodiumPer100g = sodium100Raw > 100 ? sodium100Raw / 1000 : sodium100Raw;
      // Calculate for serving size and keep precision
      sodium = (sodiumPer100g * g) / 100;
      console.log('✅ [Sodium] Using sodium_100g with serving size:', { sodium100Raw, g, sodiumPer100g, sodium, assumedUnit: sodium100Raw > 100 ? 'mg' : 'g' });
    } else {
      // No serving size, use per 100g value directly
      sodium = sodium100Raw > 100 ? sodium100Raw / 1000 : sodium100Raw;
      console.log('✅ [Sodium] Using sodium_100g (no serving size):', { sodium100Raw, sodium, assumedUnit: sodium100Raw > 100 ? 'mg' : 'g' });
    }
  }
  // Try salt_100g as last fallback
  else if (salt100 != null) {
    const g = gramsFromServing(serving);
    if (g) {
      // Salt is usually in g per 100g, convert to sodium
      sodium = (salt100 / 2.5 * g) / 100;
      console.log('✅ [Sodium] Using salt_100g with serving size:', { salt100, g, sodium, conversion: 'salt/2.5' });
    } else {
      sodium = salt100 / 2.5;
      console.log('✅ [Sodium] Using salt_100g (no serving size):', { salt100, sodium, conversion: 'salt/2.5' });
    }
  } else {
    console.log('❌ [Sodium] No sodium/salt data found');
  }

  return {
    name,
    brand: p.brands ? String(p.brands).split(",")[0].trim() : undefined,
    barcode: p.code || undefined,
    servingSize: serving,
    calories,
    protein: macro("proteins"),
    carbs: macro("carbohydrates"),
    fat: macro("fat"),
    fiber: null,
    sugar,
    sodium,
    source: "search",
  };
}

export async function searchOFFText(q: string, aborter?: AbortController): Promise<OFFProduct[]> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("page_size", "80");
  url.searchParams.set("search_terms", q);
  url.searchParams.set("lc", "en");
  url.searchParams.set("lang", "en");
  url.searchParams.set("countries_tags_en", "united-states");
  url.searchParams.set("sort_by", "popularity_key");
  url.searchParams.set(
    "fields",
    "code,product_name,product_name_en,generic_name_en,brands,brands_tags,serving_size,lc,countries_tags_en,categories_tags_en,nutriments"
  );
  const res = await fetch(url.toString(), { signal: aborter?.signal });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.products) ? data.products : [];
}

export async function searchOFFBrandFacet(brand: string, aborter?: AbortController): Promise<OFFProduct[]> {
  const base = simplify(brand).replace(/\s+/g, "-");
  const candidates = new Set<string>([
    base,
    base.replace(/-cafe\b/, ""),
    base.replace(/-café\b/, ""),
    base.replace(/é/g, "e"),
  ]);
  const out: OFFProduct[] = [];
  for (const slug of candidates) {
    const u = new URL(`https://world.openfoodfacts.org/brand/${encodeURIComponent(slug)}.json`);
    u.searchParams.set("page_size", "80");
    u.searchParams.set(
      "fields",
      "code,product_name,product_name_en,generic_name_en,brands,brands_tags,serving_size,lc,countries_tags_en,categories_tags_en,nutriments"
    );
    const r = await fetch(u.toString(), { signal: aborter?.signal });
    if (!r.ok) continue;
    const json = await r.json();
    if (Array.isArray(json?.products)) out.push(...json.products);
  }
  return out;
}

export async function searchOFFBrandFiltered(brand: string, itemQuery: string, aborter?: AbortController) {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("page_size", "80");
  url.searchParams.set("search_terms", itemQuery);
  url.searchParams.set("lc", "en");
  url.searchParams.set("lang", "en");
  url.searchParams.set("countries_tags_en", "united-states");
  url.searchParams.set("sort_by", "popularity_key");
  url.searchParams.set("tagtype_0", "brands");
  url.searchParams.set("tag_contains_0", "contains");
  url.searchParams.set("tag_0", brand);
  url.searchParams.set(
    "fields",
    "code,product_name,product_name_en,generic_name_en,brands,brands_tags,serving_size,lc,countries_tags_en,categories_tags_en,nutriments"
  );
  const res = await fetch(url.toString(), { signal: aborter?.signal });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.products) ? data.products : [];
}
