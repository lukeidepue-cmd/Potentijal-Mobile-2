import React, { createContext, useMemo, useState, useEffect, useCallback } from "react";
import { nanoid } from "nanoid/non-secure";
import { 
  getMealsForDate, 
  addFoodToMeal, 
  removeFoodFromMeal, 
  updateMealItemServings,
  getBurnedCaloriesForDate,
  upsertBurnedCalories,
  getMacroGoals,
  updateMacroGoals,
  type Meal,
  type MacroGoals as MacroGoalsType,
} from "../lib/api/meals";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";

export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snacks";
export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snacks"];

/* ---------------- Types ---------------- */
export type Food = {
  id?: string;
  name: string;
  brand?: string;
  barcode?: string;
  servingSize?: string;

  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;

  /* optional extras */
  fiber?: number | null;
  sugar?: number | null;   // ← new macro we want everywhere
  sodium?: number | null;

  source?: "barcode" | "search";
};

export type FoodEntry = Food & {
  entryId: string;
  /** 100 means 1x serving. If omitted, treat as 100. */
  servingPct?: number;
  /** Not required anywhere; kept flexible */
  createdAt?: string;
};

export type Totals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;           // ← included in all totals
};

type MealsState = Record<MealType, FoodEntry[]>;

export type MealsCtx = {
  meals: MealsState;
  selectedDate: string; // ISO date string
  setSelectedDate: (date: string) => void;
  loading: boolean;
  macroGoals: MacroGoalsType | null;
  loadMacroGoals: () => Promise<void>;
  updateMacroGoals: (goals: MacroGoalsType) => Promise<void>;

  addFood: (meal: MealType, food: Food) => Promise<string>; // returns new entryId, now async
  removeFood: (meal: MealType, entryId: string) => Promise<void>; // now async
  updateServingPct: (meal: MealType, entryId: string, pct: number) => Promise<void>; // now async

  totalsFor: (meal: MealType) => Totals;
  entryTotals: (e: FoodEntry) => Totals;

  // Burned calories (for "Net:")
  burnedCalories: number;
  setBurnedCalories: (n: number) => Promise<void>; // now async
  addBurnedCalories: (n: number) => void;

  // Day totals
  dayCalories: number; // sum of all meals (kcal)
  netCalories: number; // dayCalories - burnedCalories

  // Load meals for a date
  loadMealsForDate: (date: string) => Promise<void>;
};

const MealsContext = createContext<MealsCtx | null>(null);

// Map MealType to database meal_type
const mealTypeToDb = (meal: MealType): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
  switch (meal) {
    case 'Breakfast': return 'breakfast';
    case 'Lunch': return 'lunch';
    case 'Dinner': return 'dinner';
    case 'Snacks': return 'snack';
  }
};

const dbTypeToMealType = (type: string): MealType => {
  switch (type) {
    case 'breakfast': return 'Breakfast';
    case 'lunch': return 'Lunch';
    case 'dinner': return 'Dinner';
    case 'snack': return 'Snacks';
    default: return 'Breakfast';
  }
};

/* -------------- Provider -------------- */
export function MealsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [meals, setMeals] = useState<MealsState>({
    Breakfast: [],
    Lunch: [],
    Dinner: [],
    Snacks: [],
  });

  const [selectedDate, setSelectedDateState] = useState<string>(() => {
    // Default to today in ISO format (YYYY-MM-DD) using local time, not UTC
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [burnedCaloriesState, setBurnedCaloriesState] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [macroGoals, setMacroGoals] = useState<MacroGoalsType | null>(null);

  // Load meals for a date from backend
  const loadMealsForDate = useCallback(async (date: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: mealsData, error } = await getMealsForDate(date);
      
      if (error) {
        console.error('Failed to load meals:', error);
        setLoading(false);
        return;
      }

      // Convert backend meals to local state format
      const newMeals: MealsState = {
        Breakfast: [],
        Lunch: [],
        Dinner: [],
        Snacks: [],
      };

      (mealsData || []).forEach((meal: Meal) => {
        const mealType = dbTypeToMealType(meal.type);
        newMeals[mealType] = meal.items.map(item => ({
          id: item.id,
          name: item.foodName,
          brand: undefined,
          barcode: item.barcode,
          servingSize: undefined,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fats,
          sugar: item.sugar,
          sodium: item.sodium,
          entryId: item.id,
          servingPct: Math.round(item.servings * 100), // servings is stored as numeric (1.0 = 100%)
          createdAt: item.createdAt,
        }));
      });

      setMeals(newMeals);

      // Load burned calories
      const { data: burned } = await getBurnedCaloriesForDate(date);
      setBurnedCaloriesState(burned || 0);
    } catch (error) {
      console.error('Error loading meals:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load meals when date changes
  useEffect(() => {
    if (user) {
      loadMealsForDate(selectedDate);
    }
  }, [selectedDate, user, loadMealsForDate]);

  // Load macro goals on mount
  useEffect(() => {
    if (user) {
      loadMacroGoals();
    }
  }, [user]);

  const loadMacroGoals = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await getMacroGoals();
    if (!error && data) {
      setMacroGoals(data);
    }
  }, [user]);

  const updateMacroGoalsFn = useCallback(async (goals: MacroGoalsType) => {
    if (!user) return;
    
    const { error } = await updateMacroGoals(goals);
    if (!error) {
      setMacroGoals(goals);
    }
  }, [user]);

  const setSelectedDate = useCallback((date: string) => {
    setSelectedDateState(date);
  }, []);

  /* ---------- CRUD ---------- */
  const addFood: MealsCtx["addFood"] = async (meal, food) => {
    if (!user) {
      const entryId = nanoid();
      // For offline mode, scale values based on servings
      const servings = ((food as any).servingPct ?? 100) / 100;
      const entry: FoodEntry = {
        ...food,
        entryId,
        // Scale values for offline mode
        calories: (food.calories || 0) * servings,
        protein: (food.protein || 0) * servings,
        carbs: (food.carbs || 0) * servings,
        fat: (food.fat || 0) * servings,
        sugar: (food.sugar || 0) * servings,
        sodium: (food.sodium || 0) * servings,
        servingPct: (food as any).servingPct ?? 100,
        createdAt: new Date().toISOString(),
      };
      setMeals((prev) => ({ ...prev, [meal]: [entry, ...prev[meal]] }));
      return entryId;
    }

    // Calculate macros based on servings
    const servings = ((food as any).servingPct ?? 100) / 100;
    const { data: itemId, error } = await addFoodToMeal({
      date: selectedDate,
      type: mealTypeToDb(meal),
      food: {
        name: food.name,
        servings,
        calories: (food.calories || 0) * servings,
        protein: (food.protein || 0) * servings,
        carbs: (food.carbs || 0) * servings,
        fats: (food.fat || 0) * servings,
        sugar: (food.sugar || 0) * servings,
        sodium: (food.sodium || 0) * servings,
        barcode: food.barcode,
        externalFoodId: food.id,
      },
    });

    if (error || !itemId) {
      console.error('Failed to add food:', error);
      const entryId = nanoid();
      // For offline mode, also scale the values
      const servings = ((food as any).servingPct ?? 100) / 100;
      const entry: FoodEntry = {
        ...food,
        entryId,
        // Scale values for offline mode too
        calories: (food.calories || 0) * servings,
        protein: (food.protein || 0) * servings,
        carbs: (food.carbs || 0) * servings,
        fat: (food.fat || 0) * servings,
        sugar: (food.sugar || 0) * servings,
        sodium: (food.sodium || 0) * servings,
        servingPct: (food as any).servingPct ?? 100,
        createdAt: new Date().toISOString(),
      };
      setMeals((prev) => ({ ...prev, [meal]: [entry, ...prev[meal]] }));
      return entryId;
    }

    // Optimize: Instead of reloading all meals, just add the new item to local state
    // This is much faster than reloading from database
    // IMPORTANT: Use the SCALED values (already multiplied by servings) for local state
    // because entryTotals now expects totals, not per-serving values
    const entryId = itemId;
    const entry: FoodEntry = {
      ...food,
      id: itemId,
      entryId,
      // Use the scaled values that were saved to DB (already multiplied by servings)
      calories: (food.calories || 0) * servings,
      protein: (food.protein || 0) * servings,
      carbs: (food.carbs || 0) * servings,
      fat: (food.fat || 0) * servings,
      sugar: (food.sugar || 0) * servings,
      sodium: (food.sodium || 0) * servings,
      servingPct: (food as any).servingPct ?? 100,
      createdAt: new Date().toISOString(),
    };
    setMeals((prev) => ({ ...prev, [meal]: [entry, ...prev[meal]] }));
    return itemId;
  };

  const removeFood: MealsCtx["removeFood"] = async (meal, entryId) => {
    if (!user) {
      setMeals((prev) => ({
        ...prev,
        [meal]: prev[meal].filter((e) => e.entryId !== entryId),
      }));
      return;
    }

    const { error } = await removeFoodFromMeal(entryId);
    if (error) {
      console.error('Failed to remove food:', error);
      // Still remove from local state
      setMeals((prev) => ({
        ...prev,
        [meal]: prev[meal].filter((e) => e.entryId !== entryId),
      }));
      return;
    }

    // Reload meals
    await loadMealsForDate(selectedDate);
  };

  const updateServingPct: MealsCtx["updateServingPct"] = async (meal, entryId, pct) => {
    if (!user) {
      setMeals((prev) => ({
        ...prev,
        [meal]: prev[meal].map((e) =>
          e.entryId === entryId ? { ...e, servingPct: pct } : e
        ),
      }));
      return;
    }

    console.log('🍽️ [Servings] updateServingPct called', { meal, entryId, pct, selectedDate });
    
    // Fetch current item from database to get accurate values
    const { data: currentItem, error: fetchError } = await supabase
      .from('meal_items')
      .select('calories, protein, carbs, fats, sugar, sodium, servings')
      .eq('id', entryId)
      .single();

    console.log('🍽️ [Servings] Fetched from DB:', { currentItem, fetchError });

    if (fetchError || !currentItem) {
      console.error('❌ [Servings] Failed to fetch current item:', fetchError);
      // Fallback to local state calculation
      const entry = meals[meal].find(e => e.entryId === entryId);
      if (!entry) {
        console.log('❌ [Servings] Entry not found in local state');
        return;
      }
      
      console.log('🍽️ [Servings] Using local state fallback:', { entry });
      const currentServings = (entry.servingPct || 100) / 100;
      const newServings = pct / 100;
      const baseCalories = (entry.calories || 0) / currentServings;
      const baseProtein = (entry.protein || 0) / currentServings;
      const baseCarbs = (entry.carbs || 0) / currentServings;
      const baseFats = (entry.fat || 0) / currentServings;
      const baseSugar = (entry.sugar || 0) / currentServings;
      const baseSodium = (entry.sodium || 0) / currentServings;

      console.log('🍽️ [Servings] Local calculation:', {
        currentServings,
        newServings,
        baseCalories,
        newCalories: baseCalories * newServings,
      });

      const { error } = await updateMealItemServings(entryId, newServings, {
        calories: baseCalories * newServings,
        protein: baseProtein * newServings,
        carbs: baseCarbs * newServings,
        fats: baseFats * newServings,
        sugar: baseSugar * newServings,
        sodium: baseSodium * newServings,
      });

      if (error) {
        console.error('❌ [Servings] Failed to update servings:', error);
      } else {
        console.log('✅ [Servings] Updated successfully, reloading meals');
        await loadMealsForDate(selectedDate);
      }
      return;
    }

    // Use database values - these are the actual totals stored
    // Ensure currentServings is at least 0.01 to avoid division by zero
    const currentServings = Math.max(0.01, Number(currentItem.servings || 1));
    const newServings = Math.max(0.01, pct / 100);

    console.log('🍽️ [Servings] DB values:', {
      currentItemCalories: currentItem.calories,
      currentItemServings: currentItem.servings,
      currentServings,
      newServings,
      pct,
    });

    // Calculate base per-serving values from database totals
    // These are the values per 1 serving
    const baseCalories = Number(currentItem.calories || 0) / currentServings;
    const baseProtein = Number(currentItem.protein || 0) / currentServings;
    const baseCarbs = Number(currentItem.carbs || 0) / currentServings;
    const baseFats = Number(currentItem.fats || 0) / currentServings;
    const baseSugar = Number(currentItem.sugar || 0) / currentServings;
    const baseSodium = Number(currentItem.sodium || 0) / currentServings;

    console.log('🍽️ [Servings] Base values (per 1 serving):', {
      baseCalories,
      baseProtein,
      baseCarbs,
      baseFats,
      baseSugar,
      baseSodium,
    });

    // Calculate new totals based on new servings
    // Round to avoid floating point errors
    const newCalories = Math.round(baseCalories * newServings);
    const newProtein = Math.round(baseProtein * newServings);
    const newCarbs = Math.round(baseCarbs * newServings);
    const newFats = Math.round(baseFats * newServings);
    const newSugar = Math.round(baseSugar * newServings);
    const newSodium = Math.round(baseSodium * newServings);

    console.log('🍽️ [Servings] New totals:', {
      newCalories,
      newProtein,
      newCarbs,
      newFats,
      newSugar,
      newSodium,
      calculation: `${baseCalories} × ${newServings} = ${newCalories}`,
    });

    const { error } = await updateMealItemServings(entryId, newServings, {
      calories: newCalories,
      protein: newProtein,
      carbs: newCarbs,
      fats: newFats,
      sugar: newSugar,
      sodium: newSodium,
    });

    if (error) {
      console.error('❌ [Servings] Failed to update servings:', error);
      // Still update local state
      setMeals((prev) => ({
        ...prev,
        [meal]: prev[meal].map((e) =>
          e.entryId === entryId ? { ...e, servingPct: pct } : e
        ),
      }));
      return;
    }

    console.log('✅ [Servings] Update successful, reloading meals');
    // Reload meals to get updated values
    await loadMealsForDate(selectedDate);
    console.log('✅ [Servings] Meals reloaded');
  };

  /* ---------- Math helpers ---------- */
  const scale = (v: number | null | undefined, pct?: number) => {
    const p = pct ?? 100;
    const base = v ?? 0;
    return Math.max(0, Math.round((base * p) / 100));
  };

  /* ---------- Totals per entry & meal ---------- */
  const entryTotals: MealsCtx["entryTotals"] = (e) => {
    // IMPORTANT: When loading from DB, item.calories is already the TOTAL (calories × servings)
    // So we should NOT scale again. The servingPct is just for display/editing purposes.
    // However, if the entry was created locally (not from DB), it might need scaling.
    // We can detect this by checking if calories seems like a base value (very small) vs total.
    // Actually, simpler: always use the calories as-is since DB stores totals.
    // But wait - for local entries, we might need to scale. Let me check...
    // Actually, when we add food, we store totals in DB, so all entries from DB are totals.
    // For local entries (no user), we also store totals in the entry.
    // So we should NOT scale - the calories are already totals.
    return {
      calories: e.calories ?? 0,
      protein:  e.protein ?? 0,
      carbs:    e.carbs ?? 0,
      fat:      e.fat ?? 0,
      sugar:    e.sugar ?? 0,
    };
  };

  const totalsFor: MealsCtx["totalsFor"] = (meal) => {
    return meals[meal].reduce<Totals>(
      (acc, e) => {
        const t = entryTotals(e);
        acc.calories += t.calories;
        acc.protein  += t.protein;
        acc.carbs    += t.carbs;
        acc.fat      += t.fat;
        acc.sugar    += t.sugar;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0 }
    );
  };

  /* ---------- Day & net ---------- */
  const dayCalories = useMemo(
    () => MEAL_TYPES.reduce((sum, m) => sum + totalsFor(m).calories, 0),
    [meals]
  );

  const netCalories = useMemo(
    () => Math.max(0, dayCalories - burnedCaloriesState),
    [dayCalories, burnedCaloriesState]
  );

  const setBurnedCalories: MealsCtx["setBurnedCalories"] = async (n: number) => {
    setBurnedCaloriesState(n);
    
    if (user) {
      const { error } = await upsertBurnedCalories({
        date: selectedDate,
        calories: n,
      });
      if (error) {
        console.error('Failed to save burned calories:', error);
      }
    }
  };

  const addBurnedCalories = (n: number) => {
    const newValue = Math.max(0, burnedCaloriesState + n);
    setBurnedCalories(newValue);
  };

  const value: MealsCtx = {
    meals,
    selectedDate,
    setSelectedDate,
    loading,
    macroGoals,
    loadMacroGoals,
    updateMacroGoals: updateMacroGoalsFn,
    addFood,
    removeFood,
    updateServingPct,
    totalsFor,
    entryTotals,
    burnedCalories: burnedCaloriesState,
    setBurnedCalories,
    addBurnedCalories,
    dayCalories,
    netCalories,
    loadMealsForDate,
  };

  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>;
}

/* -------------- Hook -------------- */
export function useMeals() {
  const ctx = React.useContext(MealsContext);
  if (!ctx) throw new Error("useMeals must be used inside MealsProvider");
  return ctx;
}



