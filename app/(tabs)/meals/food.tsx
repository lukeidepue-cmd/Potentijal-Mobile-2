import React, { useMemo, useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useMeals,
  type MealType,
  type Food,
  type FoodEntry,
} from "../../../providers/MealsContext";

/* ---- Theme (matches scan screen) ---- */
const DARK = "#0A0F14";
const CARD = "#111822";
const TEXT = "#E6F1FF";
const DIM = "#8AA0B5";
const GREEN = "#2BF996";

/* -------------------- helpers: robust number + key lookup -------------------- */
const asNum = (v: any): number | null =>
  v == null ? null : Number.isFinite(+v) ? +v : null;

/** get first numeric value among possible paths (supports nested objects) */
function pickNumber(obj: any, paths: string[]): number | null {
  for (const p of paths) {
    // support simple "a.b.c" paths
    const parts = p.split(".");
    let cur: any = obj;
    for (const part of parts) {
      if (!cur) break;
      cur = cur[part];
    }
    const n = asNum(cur);
    if (n != null) return n;
  }
  return null;
}

/** Normalize per-serving sugar in grams */
function getSugarG(x: any): number | null {
  // common keys across our providers
  const g =
    pickNumber(x, [
      "sugar",
      "sugars",
      "total_sugars",
      "totalSugars",
      "sugars_total",
      "sugar_g",
      "sugars_g",
      "sugars_grams",
      "sugar_grams",
      "nutrition.sugar",
      "nutrition.sugars",
      "nutriments.sugars",
    ]);
  return g;
}

/** Normalize per-serving sodium in grams (accept mg + salt) */
function getSodiumG(x: any): number | null {
  // direct grams first
  const g =
    pickNumber(x, [
      "sodium",
      "sodium_g",
      "nutrition.sodium",
      "nutriments.sodium",
    ]);
  if (g != null) return g;

  // mg -> g
  const mg = pickNumber(x, ["sodium_mg", "nutrition.sodium_mg", "nutriments.sodium_mg"]);
  if (mg != null) return mg / 1000;

  // salt (g) -> sodium (g)
  const saltG = pickNumber(x, ["salt", "salt_g", "nutrition.salt", "nutriments.salt"]);
  if (saltG != null) return saltG / 2.5;

  return null;
}

/** scale by servings, keeping one decimal */
const scale = (v: number | null, servings: number) =>
  v == null ? null : Math.round(v * servings * 10) / 10;

export default function FoodDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ meal?: string; food?: string; entryId?: string }>();

  const meal = (params.meal as MealType) || "Breakfast";
  const entryId = params.entryId as string | undefined;

  const { meals, addFood, updateServingPct } = useMeals();

  /** A) Opened from already-tracked entry */
  const existingEntry: FoodEntry | undefined = useMemo(
    () => (entryId ? meals[meal].find((e) => e.entryId === entryId) : undefined),
    [entryId, meal, meals]
  );

  /** B) Opened from search results */
  const incomingFood: Food | null = useMemo(() => {
    if (!params.food) return null;
    try {
      return JSON.parse(decodeURIComponent(params.food)) as Food;
    } catch {
      return null;
    }
  }, [params.food]);

  /** Determine base values shown for 1 serving */
  const base = (existingEntry as any) ?? (incomingFood as any) ?? {};
  
  // If this is an existing entry from DB, the values are already TOTALS (calories × servings)
  // So we need to calculate the base per-serving by dividing by current servings
  const currentServings = existingEntry ? ((existingEntry.servingPct ?? 100) / 100) : 1;
  
  const basePerServing = existingEntry ? {
    // For existing entries: divide totals by current servings to get base per-serving
    calories: asNum(base.calories) / currentServings,
    protein: asNum(base.protein) / currentServings,
    carbs: asNum(base.carbs) / currentServings,
    fat: asNum(base.fat) / currentServings,
    sugar: (getSugarG(base) ?? 0) / currentServings,
    sodium: (getSodiumG(base) ?? 0) / currentServings,
  } : {
    // For new entries: values are already per-serving
    calories: asNum(base.calories),
    protein: asNum(base.protein),
    carbs: asNum(base.carbs),
    fat: asNum(base.fat),
    sugar: getSugarG(base) ?? 0,
    sodium: getSodiumG(base) ?? 0,
  };

  /** Controlled servings input: use servingPct from incomingFood if available, otherwise default to 1 */
  const getInitialServings = () => {
    if (existingEntry) {
      return String(Math.max(0.01, (existingEntry.servingPct ?? 100) / 100));
    }
    if (incomingFood && (incomingFood as any).servingPct) {
      return String(Math.max(0.01, ((incomingFood as any).servingPct ?? 100) / 100));
    }
    return "1";
  };
  
  const [servingsText, setServingsText] = useState(getInitialServings);
  
  // Update servings when incomingFood changes (e.g., from scanner)
  useEffect(() => {
    if (incomingFood && !existingEntry) {
      const newServings = getInitialServings();
      setServingsText(newServings);
    }
  }, [incomingFood, existingEntry]);
  const servings = Math.max(0, Number(servingsText.replace(/[^\d.]/g, "")) || 0);

  /** Scaled values to display */
  const shown = useMemo(
    () => ({
      calories: scale(basePerServing.calories, servings),
      protein: scale(basePerServing.protein, servings),
      carbs: scale(basePerServing.carbs, servings),
      fat: scale(basePerServing.fat, servings),
      sugar: scale(basePerServing.sugar, servings),
      sodium: scale(basePerServing.sodium, servings),
    }),
    [
      basePerServing.calories,
      basePerServing.protein,
      basePerServing.carbs,
      basePerServing.fat,
      basePerServing.sugar,
      basePerServing.sodium,
      servings,
    ]
  );

  const title = (existingEntry?.name ?? incomingFood?.name ?? "Food").trim();
  const brand = (existingEntry?.brand ?? incomingFood?.brand)?.trim();
  const servingSize = (existingEntry?.servingSize ?? incomingFood?.servingSize)?.trim();

  /** Save / Add */
  const onSaveExisting = async () => {
    if (!existingEntry) return;
    const pct = Math.max(1, Math.round((servings || 1) * 100)); // servings -> servingPct
    await updateServingPct(meal, existingEntry.entryId, pct);
    router.back();
  };
  const onAddFromSearch = async () => {
    if (!incomingFood) return;
    
    // IMPORTANT: Pass BASE per-serving values and servingPct
    // The addFood function will scale them correctly based on servings
    // Use basePerServing (not shown) because addFood will multiply by servings
    const normalizedSugar = getSugarG(incomingFood);
    const normalizedSodium = getSodiumG(incomingFood);
    
    const payload: Food = {
      ...incomingFood,
      id: undefined,
      // Use base per-serving values (basePerServing), not scaled values
      calories: basePerServing.calories,
      protein: basePerServing.protein,
      carbs: basePerServing.carbs,
      fat: basePerServing.fat,
      sugar: normalizedSugar ?? 0,
      sodium: normalizedSodium ?? 0,
      // Set servingPct to reflect the servings the user entered
      ...( { servingPct: Math.max(1, Math.round((servings || 1) * 100)) } as any ),
      source: incomingFood.source ?? "search",
    };
    await addFood(meal, payload);
    router.replace('/(tabs)/meals');
  };

  /** UI — post-scan style (no outer heading/green line) */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DARK }}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
        {/* back-only header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <View style={{ width: 36 }} />
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            <View style={{ padding: 16, gap: 18 }}>
              <View style={styles.card}>
                <View style={styles.headerBox}>
                  <Text style={styles.title} numberOfLines={2}>
                    {title}
                  </Text>
                  {!!brand && <Text style={styles.dim}>{brand}</Text>}
                  {!!servingSize && <Text style={styles.dim}>Serving size: {servingSize}</Text>}
                </View>

                {/* Servings row */}
                <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={styles.section}>Servings:</Text>
                  <TextInput
                    value={servingsText}
                    onChangeText={setServingsText}
                    placeholder="Number of Servings…"
                    placeholderTextColor="#8AA0B5"
                    keyboardType="decimal-pad"
                    style={[styles.servingsInput, { flex: 1 }]}
                  />
                </View>

                {/* Macros (no fiber) */}
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.section}>Macros</Text>
                  {macroRow("Calories", shown.calories, "kcal")}
                  {macroRow("Protein",  shown.protein,  "g")}
                  {macroRow("Carbs",    shown.carbs,    "g")}
                  {macroRow("Fat",      shown.fat,      "g")}
                  {macroRow("Sugar",    shown.sugar,    "g")}
                  {macroRow("Sodium",   Math.round((shown.sodium || 0) * 1000),   "mg")}
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              {existingEntry ? (
                <Pressable onPress={onSaveExisting} style={styles.saveBtn}>
                  <Text style={styles.saveText}>Save</Text>
                </Pressable>
              ) : (
                <Pressable onPress={onAddFromSearch} style={styles.saveBtn}>
                  <Text style={styles.saveText}>Add to {meal}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function macroRow(label: string, value?: number | null, unit?: string) {
  const displayValue = value != null ? value : 0;
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{displayValue.toFixed(1)} {unit || ""}</Text>
    </View>
  );
}

/* ---- Styles ---- */
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  backArrow: { color: TEXT, fontSize: 26, lineHeight: 26, fontWeight: "700" },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1a2430",
  },
  headerBox: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1a2430",
    marginBottom: 6,
  },

  title: { color: TEXT, fontSize: 18, fontWeight: "800" },
  section: { color: TEXT, fontSize: 14, fontWeight: "700" },
  dim: { color: DIM },

  servingsInput: {
    backgroundColor: "#0E141C",
    color: TEXT,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1a2430",
    fontWeight: "900",
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLabel: { color: TEXT, fontSize: 14 },
  rowValue: { color: GREEN, fontSize: 14, fontWeight: "800" },

  footer: { padding: 16 },
  saveBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#0e3c24",
  },
  saveText: { color: "#052d1b", fontWeight: "900", fontSize: 16 },
});





