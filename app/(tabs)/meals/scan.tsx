// Scanner screen (inside Meals). Robust sugar/sodium parsing.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { type MealType } from "../../../providers/MealsContext";

// ---- Types ----
type Nutriments = {
  calories?: number | null;
  protein?: number | null; // g
  carbs?: number | null;   // g
  fat?: number | null;     // g
  sugar?: number | null;   // g
  sodium?: number | null;  // g
};

type ScanProduct = {
  ok: boolean;
  barcode: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  servingSize?: string | null;
  perServing?: Nutriments;
  per100g?: Nutriments;
};

export default function ScanMealsScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ScanProduct | null>(null);

  // camera controls
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");

  // servings (defaults to 1)
  const [servingsText, setServingsText] = useState("1");
  const servings = Math.max(0, Number(servingsText.replace(/[^\d.]/g, "")) || 0);

  // meal dropdown
  const [openMeal, setOpenMeal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null); // null => "Choose meal"

  // guard against rapid "Add"
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission, requestPermission]);

  const onScan = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (scanned) return;
      setScanned(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);
      setError(null);
      try {
        const info = await lookupOpenFoodFacts(data);
        setProduct(info);
        if (!info.ok) setError("Product not found. You can rescan or add manually.");
      } catch (e: any) {
        setError(e?.message || "Scan failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [scanned]
  );

  // Scaled macros based on servings (fallback to per100g if perServing is missing)
  const scaled = useMemo(() => {
    const base = product;
    const src = base?.perServing?.calories != null ? base?.perServing : base?.per100g;
    const mul = Math.max(0, servings || 0);
    const num = (v?: number | null) => (v == null ? null : Math.round(v * mul * 10) / 10);
    return {
      calories: num(src?.calories ?? null),
      protein:  num(src?.protein  ?? null),
      carbs:    num(src?.carbs    ?? null),
      fat:      num(src?.fat      ?? null),
      sugar:    num(src?.sugar    ?? null),
      sodium:   num(src?.sodium   ?? null),
    };
  }, [product, servings]);

  const addToMeals = useCallback(async () => {
    if (!product) return;
    if (!selectedMeal) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Choose meal", "Please pick a meal before adding.");
      return;
    }
    if (adding) return;
    setAdding(true);

    const entry = {
      name: product.name || "Food item",
      brand: product.brand || undefined,
      barcode: product.barcode,
      servingSize: product.servingSize || undefined,
      calories: product.perServing?.calories ?? product.per100g?.calories ?? null,
      protein:  product.perServing?.protein  ?? product.per100g?.protein  ?? null,
      carbs:    product.perServing?.carbs    ?? product.per100g?.carbs    ?? null,
      fat:      product.perServing?.fat      ?? product.per100g?.fat      ?? null,
      sugar:    product.perServing?.sugar    ?? product.per100g?.sugar    ?? null,
      sodium:   product.perServing?.sodium   ?? product.per100g?.sodium   ?? null,
      servingPct: Math.max(1, Math.round((servings || 1) * 100)),
      source: "barcode",
      createdAt: new Date().toISOString(),
    };

    try {
      const payload = encodeURIComponent(JSON.stringify(entry));
      router.push({ pathname: "/(tabs)/meals", params: { add: payload, to: selectedMeal } });
    } catch {
      Alert.alert("Could not prepare item", "Open Meals and add manually.");
      setAdding(false);
    }
  }, [adding, product, servings, router, selectedMeal]);

  if (Platform.OS === "web") {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Scanner not available on web preview</Text>
        <Text style={styles.dim}>Open this project in Expo Go on your phone to use the camera.</Text>
      </View>
    );
  }
  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>Requesting camera permission…</Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.dim}>Enable camera permission in Settings to scan barcodes.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned ? (
        <View style={styles.scannerWrap}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            enableTorch={torch}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128"],
            }}
            onBarcodeScanned={onScan}
          />

          {/* Back button */}
          <View style={{ position: 'absolute', top: 50, left: 16, zIndex: 10 }}>
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(0,0,0,0.5)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Torch + Flip */}
          <View style={styles.topRight}>
            <TouchableOpacity onPress={() => setTorch((t) => !t)} style={styles.pillBtn}>
              <Text style={styles.pillText}>{torch ? "Torch ON" : "Torch"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))} style={styles.pillBtn}>
              <Text style={styles.pillText}>Flip</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom helper + frame */}
          <View style={styles.overlay}>
            <View style={styles.frame} />
            <Text style={styles.helper}>Align barcode within the frame</Text>
          </View>
        </View>
      ) : null}

      {(loading || product || error) && (
        <ScrollView style={styles.panel} contentContainerStyle={{ padding: 16 }}>
          {loading && (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={[styles.dim, { marginTop: 8 }]}>Looking up nutrition…</Text>
            </View>
          )}

          {!!error && !loading && (
            <View style={[styles.card, { marginTop: 18 }]}>
              <Text style={styles.error}>{error}</Text>
            </View>
          )}

          {!!product && !loading && (
            <View style={{ gap: 10 }}>
              <View style={{ marginTop: 42 }}>
                <View style={styles.card}>
                  {/* Header row (name/brand/serving line) */}
                  <View style={styles.headerBox}>
                    <Text style={styles.title} numberOfLines={2}>
                      {product.name}
                    </Text>
                    {!!product.brand && <Text style={styles.dim}>{product.brand}</Text>}
                    {!!product.servingSize && <Text style={styles.dim}>Serving size: {product.servingSize}</Text>}
                  </View>

                  {/* Servings input */}
                  <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
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

                  {/* Macros */}
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.section}>Macros</Text>
                    {macroRow("Calories", scaled.calories, "kcal")}
                    {macroRow("Protein",  scaled.protein,  "g")}
                    {macroRow("Carbs",    scaled.carbs,    "g")}
                    {macroRow("Fat",      scaled.fat,      "g")}
                    {macroRow("Sugar",    scaled.sugar,    "g")}
                    {macroRow("Sodium",   scaled.sodium,   "g")}
                  </View>
                </View>
              </View>

              {/* Meal chooser */}
              <View style={{ position: "relative" }}>
                <Pressable
                  onPress={() => setOpenMeal((v) => !v)}
                  style={[styles.dropdown, openMeal && styles.dropdownActive]}
                >
                  <Text style={styles.dropdownText}>{selectedMeal ?? "Choose meal"}</Text>
                  <Ionicons name="chevron-down" size={12} color={openMeal ? "#2bf996" : "#e6f1ff"} />
                </Pressable>
                {openMeal && (
                  <View style={styles.menu}>
                    {(["Breakfast", "Lunch", "Dinner", "Snacks"] as MealType[]).map((m) => (
                      <Pressable
                        key={m}
                        onPress={() => {
                          setSelectedMeal(m);
                          setOpenMeal(false);
                        }}
                        style={styles.menuItem}
                      >
                        <Text style={styles.menuText}>{m}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Add + Rescan */}
              <TouchableOpacity
                style={[styles.primaryBtn, adding && { opacity: 0.6 }]}
                onPress={addToMeals}
                disabled={adding}
              >
                <Text style={styles.primaryBtnText}>{adding ? "Adding…" : "Add to Meals"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setScanned(false);
                  setProduct(null);
                  setError(null);
                  setSelectedMeal(null);
                  setServingsText("1");
                }}
              >
                <Text style={styles.secondaryBtnText}>Rescan</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function macroRow(label: string, value?: number | null, unit?: string) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value != null ? `${value} ${unit || ""}` : "—"}</Text>
    </View>
  );
}

/* ---------------- Nutrition lookup (Open Food Facts) ----------------
   More robust lookups for sugar & sodium with salt fallbacks.        */
async function lookupOpenFoodFacts(barcode: string): Promise<ScanProduct> {
  const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;
  const res = await fetch(url);
  const json = await res.json();

  if (!json || json.status !== 1) {
    return { ok: false, barcode, name: "Unknown product", perServing: {}, per100g: {} } as ScanProduct;
  }

  const p = json.product || {};
  const n = p.nutriments || {};

  const pick = (obj: any, keys: string[]) => {
    for (const k of keys) {
      const v = obj?.[k];
      const num = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
      if (isFinite(num)) return num;
    }
    return null;
  };

  // --- helpers for energy ---
  const kcal100 = pick(n, ["energy-kcal_100g", "energy-kcal_value"]);
  const kj100   = pick(n, ["energy_100g"]);
  const kcalServ = pick(n, ["energy-kcal_serving"]);
  const kjServ   = pick(n, ["energy_serving"]);

  // --- sugar fallbacks ---
  const sugar100 =
    pick(n, ["sugars_100g", "sugars_100ml", "sugar_100g", "added-sugars_100g"]) ?? null;
  const sugarServ =
    pick(n, ["sugars_serving", "sugar_serving", "added-sugars_serving"]) ?? null;

  // --- sodium fallbacks (use salt/2.5 if sodium missing) ---
  const sodium100Raw = pick(n, ["sodium_100g", "sodium_100ml"]);
  const salt100 = pick(n, ["salt_100g", "salt_100ml"]);
  const sodium100 = sodium100Raw ?? (salt100 != null ? salt100 / 2.5 : null);

  const sodiumServRaw = pick(n, ["sodium_serving"]);
  const saltServ = pick(n, ["salt_serving"]);
  const sodiumServ = sodiumServRaw ?? (saltServ != null ? saltServ / 2.5 : null);

  const per100g: Nutriments = {
    calories: kcal100 ?? (kj100 != null ? Math.round((kj100 / 4.184) * 10) / 10 : null),
    protein:  pick(n, ["proteins_100g"]),
    carbs:    pick(n, ["carbohydrates_100g"]),
    fat:      pick(n, ["fat_100g"]),
    sugar:    sugar100,
    sodium:   sodium100,
  };

  const perServing: Nutriments = {
    calories: kcalServ ?? (kjServ != null ? Math.round((kjServ / 4.184) * 10) / 10 : null),
    protein:  pick(n, ["proteins_serving"]),
    carbs:    pick(n, ["carbohydrates_serving"]),
    fat:      pick(n, ["fat_serving"]),
    sugar:    sugarServ,
    sodium:   sodiumServ,
  };

  return {
    ok: true,
    barcode,
    name: p.product_name || p.generic_name || "Scanned product",
    brand: p.brands || null,
    imageUrl: p.image_front_url || p.image_url || null,
    servingSize: p.serving_size || null,
    perServing,
    per100g,
  } as ScanProduct;
}

// ---- Styles ----
const DARK = "#0a0f14";
const CARD = "#111822";
const TEXT = "#e6f1ff";
const DIM = "#8aa0b5";
const GREEN = "#2bf996";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  scannerWrap: { flex: 1, minHeight: 280, position: "relative" },

  topRight: {
    position: "absolute",
    top: 32,
    right: 16,
    flexDirection: "row",
    gap: 8,
  },
  pillBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  pillText: { color: "#fff", fontWeight: "800" },

  overlay: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 24 },
  frame: {
    width: 240,
    height: 160,
    borderColor: GREEN,
    borderWidth: 2,
    borderRadius: 12,
    position: "absolute",
    top: "30%",
  },
  helper: { color: DIM, marginTop: 8 },

  panel: { backgroundColor: DARK, flex: 1 },

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
  error: { color: "#ff6b6b", fontWeight: "700" },

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

  // Dropdown
  dropdown: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#0B121A",
    borderWidth: 1,
    borderColor: "#1a2430",
  },
  dropdownActive: { borderColor: GREEN, backgroundColor: "#0E1316" },
  dropdownText: { color: TEXT, fontSize: 14, fontWeight: "800" },
  menu: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: "#0E1216",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    zIndex: 20,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  menuText: { color: TEXT, fontSize: 14, fontWeight: "800" },

  primaryBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  primaryBtnText: { color: "#052d1b", fontWeight: "900", fontSize: 16 },
  secondaryBtn: {
    backgroundColor: "#0b121a",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1a2430",
  },
  secondaryBtnText: { color: TEXT, fontWeight: "700" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});






