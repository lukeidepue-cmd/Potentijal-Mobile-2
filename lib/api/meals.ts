// lib/api/meals.ts
// API functions for meals, macros, and nutrition tracking

import { supabase } from '../supabase';
import type { MealType } from '../types';

export interface MealItem {
  id: string;
  mealId: string;
  foodName: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sugar: number;
  sodium: number;
  barcode?: string;
  externalFoodId?: string;
  createdAt: string;
}

export interface Meal {
  id: string;
  userId: string;
  date: string;
  type: MealType;
  items: MealItem[];
  createdAt: string;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sugar: number;
  sodium: number;
}

export interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sugar: number;
  sodium: number;
}

/**
 * Get all meals and items for a specific date
 */
export async function getMealsForDate(date: string): Promise<{ data: Meal[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Fetch meals for the date
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('id, date, type, created_at')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('type');

    if (mealsError) {
      return { data: null, error: mealsError };
    }

    if (!meals || meals.length === 0) {
      return { data: [], error: null };
    }

    // Fetch meal items for each meal
    const mealIds = meals.map(m => m.id);
    const { data: items, error: itemsError } = await supabase
      .from('meal_items')
      .select('*')
      .in('meal_id', mealIds)
      .order('created_at');

    if (itemsError) {
      return { data: null, error: itemsError };
    }

    // Group items by meal
    const mealsWithItems: Meal[] = meals.map(meal => ({
      id: meal.id,
      userId: user.id,
      date: meal.date,
      type: meal.type as MealType,
      items: (items || [])
        .filter(item => item.meal_id === meal.id)
        .map(item => ({
          id: item.id,
          mealId: item.meal_id,
          foodName: item.food_name,
          servings: Number(item.servings),
          calories: Number(item.calories),
          protein: Number(item.protein),
          carbs: Number(item.carbs),
          fats: Number(item.fats),
          sugar: Number(item.sugar),
          sodium: Number(item.sodium),
          barcode: item.barcode || undefined,
          externalFoodId: item.external_food_id || undefined,
          createdAt: item.created_at,
        })),
      createdAt: meal.created_at,
    }));

    return { data: mealsWithItems, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get macro totals for a specific date (sum of all meal items)
 */
export async function getMacroTotalsForDate(date: string): Promise<{ data: MacroTotals | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get all meal items for the date
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', date);

    if (mealsError) {
      return { data: null, error: mealsError };
    }

    if (!meals || meals.length === 0) {
      return {
        data: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          sugar: 0,
          sodium: 0,
        },
        error: null,
      };
    }

    const mealIds = meals.map(m => m.id);
    const { data: items, error: itemsError } = await supabase
      .from('meal_items')
      .select('calories, protein, carbs, fats, sugar, sodium')
      .in('meal_id', mealIds);

    if (itemsError) {
      return { data: null, error: itemsError };
    }

    // Sum all macros
    const totals: MacroTotals = (items || []).reduce(
      (acc, item) => ({
        calories: acc.calories + Number(item.calories || 0),
        protein: acc.protein + Number(item.protein || 0),
        carbs: acc.carbs + Number(item.carbs || 0),
        fats: acc.fats + Number(item.fats || 0),
        sugar: acc.sugar + Number(item.sugar || 0),
        sodium: acc.sodium + Number(item.sodium || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0, sodium: 0 }
    );

    return { data: totals, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Add food to a meal (creates meal if it doesn't exist, then adds item)
 */
export async function addFoodToMeal(params: {
  date: string;
  type: MealType;
  food: {
    name: string;
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    sugar: number;
    sodium: number;
    barcode?: string;
    externalFoodId?: string;
  };
}): Promise<{ data: string | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // 1. Ensure meal exists (upsert)
    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .upsert(
        {
          user_id: user.id,
          date: params.date,
          type: params.type,
        },
        {
          onConflict: 'user_id,date,type',
        }
      )
      .select('id')
      .single();

    if (mealError || !meal) {
      return { data: null, error: mealError || { message: 'Failed to create meal' } };
    }

    // 2. Insert meal item
    const { data: item, error: itemError } = await supabase
      .from('meal_items')
      .insert({
        meal_id: meal.id,
        food_name: params.food.name,
        servings: params.food.servings,
        calories: params.food.calories,
        protein: params.food.protein,
        carbs: params.food.carbs,
        fats: params.food.fats,
        sugar: params.food.sugar,
        sodium: params.food.sodium,
        barcode: params.food.barcode || null,
        external_food_id: params.food.externalFoodId || null,
      })
      .select('id')
      .single();

    if (itemError || !item) {
      return { data: null, error: itemError || { message: 'Failed to add food item' } };
    }

    return { data: item.id, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Remove a food item from a meal
 */
export async function removeFoodFromMeal(itemId: string): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'User not authenticated' } };
    }

    // Verify user owns this item (via meal)
    const { data: item, error: itemError } = await supabase
      .from('meal_items')
      .select('meal_id, meals!inner(user_id)')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return { error: itemError || { message: 'Item not found' } };
    }

    // Delete the item
    const { error: deleteError } = await supabase
      .from('meal_items')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      return { error: deleteError };
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Update servings for a meal item
 */
export async function updateMealItemServings(
  itemId: string,
  servings: number,
  updatedMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    sugar: number;
    sodium: number;
  }
): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'User not authenticated' } };
    }

    const { error } = await supabase
      .from('meal_items')
      .update({
        servings,
        calories: updatedMacros.calories,
        protein: updatedMacros.protein,
        carbs: updatedMacros.carbs,
        fats: updatedMacros.fats,
        sugar: updatedMacros.sugar,
        sodium: updatedMacros.sodium,
      })
      .eq('id', itemId);

    if (error) {
      return { error };
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Upsert burned calories for a date
 */
export async function upsertBurnedCalories(params: {
  date: string;
  calories: number;
}): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'User not authenticated' } };
    }

    const { error } = await supabase
      .from('daily_burned_calories')
      .upsert(
        {
          user_id: user.id,
          date: params.date,
          calories: params.calories,
        },
        {
          onConflict: 'user_id,date',
        }
      );

    if (error) {
      return { error };
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Get burned calories for a date
 */
export async function getBurnedCaloriesForDate(date: string): Promise<{ data: number | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('daily_burned_calories')
      .select('calories')
      .eq('user_id', user.id)
      .eq('date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found - return 0
        return { data: 0, error: null };
      }
      return { data: null, error };
    }

    return { data: Number(data?.calories || 0), error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get macro goals for the current user (or defaults)
 */
export async function getMacroGoals(): Promise<{ data: MacroGoals | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('macro_goals')
      .select('calories, protein, carbs, fats, sugar, sodium')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found - return defaults
        return {
          data: {
            calories: 2500,
            protein: 150,
            carbs: 400,
            fats: 100,
            sugar: 80,
            sodium: 2000,
          },
          error: null,
        };
      }
      return { data: null, error };
    }

    return {
      data: {
        calories: Number(data.calories),
        protein: Number(data.protein),
        carbs: Number(data.carbs),
        fats: Number(data.fats),
        sugar: Number(data.sugar),
        sodium: Number(data.sodium),
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Update macro goals for the current user
 */
export async function updateMacroGoals(goals: MacroGoals): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'User not authenticated' } };
    }

    const { error } = await supabase
      .from('macro_goals')
      .upsert(
        {
          user_id: user.id,
          calories: goals.calories,
          protein: goals.protein,
          carbs: goals.carbs,
          fats: goals.fats,
          sugar: goals.sugar,
          sodium: goals.sodium,
        },
        {
          onConflict: 'user_id',
        }
      );

    if (error) {
      return { error };
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

