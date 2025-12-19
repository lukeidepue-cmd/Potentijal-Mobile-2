// hooks/useMacroProgressGraphDirect.ts
// Direct query approach for macro progress - bypasses RPC to avoid type issues

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { ProgressDataPoint } from './useExerciseProgressGraph';

export type MacroMetric = 'calories' | 'protein' | 'carbs' | 'fats' | 'sugar' | 'sodium';

export function useMacroProgressGraphDirect(params: {
  metric: MacroMetric;
  days: 7 | 30 | 90 | 180 | 360;
}) {
  const { user } = useAuth();
  const [data, setData] = useState<ProgressDataPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Calculate bucket configuration
    let bucketCount: number;
    let bucketSizeDays: number;
    switch (params.days) {
      case 7: bucketCount = 7; bucketSizeDays = 1; break;
      case 30: bucketCount = 4; bucketSizeDays = 7; break;
      case 90: bucketCount = 6; bucketSizeDays = 15; break;
      case 180: bucketCount = 6; bucketSizeDays = 30; break;
      case 360: bucketCount = 6; bucketSizeDays = 60; break;
      default: bucketCount = 7; bucketSizeDays = 1;
    }

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (bucketCount * bucketSizeDays));
    startDate.setHours(0, 0, 0, 0);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Query meals and meal_items directly
    supabase
      .from('meals')
      .select('id, date')
      .eq('user_id', user.id)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: false })
      .then(async ({ data: meals, error: mealsError }) => {
        if (mealsError || !meals || meals.length === 0) {
          setLoading(false);
          setData([]);
          return;
        }

        // Create a map of meal_id to date for easy lookup
        const mealDateMap: Record<string, string> = {};
        meals.forEach((meal: any) => {
          mealDateMap[meal.id] = meal.date;
        });

        const mealIds = meals.map(m => m.id);
        
        // Get all meal items (simpler query without join)
        const { data: items, error: itemsError } = await supabase
          .from('meal_items')
          .select('calories, protein, carbs, fats, sugar, sodium, meal_id')
          .in('meal_id', mealIds);

        if (itemsError || !items) {
          setLoading(false);
          setData([]);
          return;
        }

        // Group items by date and calculate totals per day
        const dailyTotals: Record<string, {
          calories: number;
          protein: number;
          carbs: number;
          fats: number;
          sugar: number;
          sodium: number;
        }> = {};

        console.log('📊 [Macro Graph] Processing items:', { itemCount: items.length, mealCount: meals.length });
        
        items.forEach((item: any) => {
          const date = mealDateMap[item.meal_id];
          if (!date) {
            console.log('⚠️ [Macro Graph] Item missing date:', { meal_id: item.meal_id });
            return;
          }

          if (!dailyTotals[date]) {
            dailyTotals[date] = { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0, sodium: 0 };
          }

          const itemCalories = Number(item.calories || 0);
          const itemProtein = Number(item.protein || 0);
          const itemCarbs = Number(item.carbs || 0);
          const itemFats = Number(item.fats || 0);
          const itemSugar = Number(item.sugar || 0);
          const itemSodium = Number(item.sodium || 0);

          dailyTotals[date].calories += itemCalories;
          dailyTotals[date].protein += itemProtein;
          dailyTotals[date].carbs += itemCarbs;
          dailyTotals[date].fats += itemFats;
          dailyTotals[date].sugar += itemSugar;
          dailyTotals[date].sodium += itemSodium;
        });

        // If tracking calories, subtract burned calories from daily totals
        if (params.metric === 'calories') {
          const allDates = Object.keys(dailyTotals);
          if (allDates.length > 0) {
            // Fetch burned calories for all dates
            const { data: burnedData, error: burnedError } = await supabase
              .from('daily_burned_calories')
              .select('date, calories')
              .eq('user_id', user.id)
              .in('date', allDates);

            if (!burnedError && burnedData) {
              const burnedMap: Record<string, number> = {};
              burnedData.forEach((b: any) => {
                burnedMap[b.date] = Number(b.calories || 0);
              });

              // Subtract burned calories from daily totals
              allDates.forEach(date => {
                const burned = burnedMap[date] || 0;
                dailyTotals[date].calories = Math.max(0, dailyTotals[date].calories - burned);
                console.log('📊 [Macro Graph] Net calories:', { date, foodCalories: dailyTotals[date].calories + burned, burned, netCalories: dailyTotals[date].calories });
              });
            }
          }
        }

        console.log('📊 [Macro Graph] Daily totals:', dailyTotals);

        // Create buckets
        const buckets: Array<{
          bucketIndex: number;
          bucketStart: Date;
          bucketEnd: Date;
          values: number[];
        }> = [];

        for (let i = 0; i < bucketCount; i++) {
          const bucketStart = new Date(startDate);
          bucketStart.setDate(bucketStart.getDate() + (i * bucketSizeDays));
          const bucketEnd = new Date(bucketStart);
          bucketEnd.setDate(bucketEnd.getDate() + bucketSizeDays - 1);
          bucketEnd.setHours(23, 59, 59, 999);

          buckets.push({
            bucketIndex: i,
            bucketStart,
            bucketEnd,
            values: [],
          });
        }

        // Assign daily totals to buckets
        Object.entries(dailyTotals).forEach(([dateStr, totals]) => {
          // Parse date string as local date (not UTC) to avoid timezone issues
          const [year, month, day] = dateStr.split('-').map(Number);
          const date = new Date(year, month - 1, day); // month is 0-indexed
          
          for (let i = 0; i < buckets.length; i++) {
            const bucket = buckets[i];
            // Compare dates at midnight local time
            const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const bucketStartMidnight = new Date(bucket.bucketStart.getFullYear(), bucket.bucketStart.getMonth(), bucket.bucketStart.getDate());
            const bucketEndMidnight = new Date(bucket.bucketEnd.getFullYear(), bucket.bucketEnd.getMonth(), bucket.bucketEnd.getDate());
            
            if (dateMidnight >= bucketStartMidnight && dateMidnight <= bucketEndMidnight) {
              const metricValue = totals[params.metric === 'fats' ? 'fats' : params.metric];
              bucket.values.push(metricValue);
              console.log('📊 [Macro Graph] Assigned to bucket:', {
                date: dateStr,
                bucketIndex: bucket.bucketIndex,
                bucketRange: `${bucket.bucketStart.toISOString().split('T')[0]} to ${bucket.bucketEnd.toISOString().split('T')[0]}`,
                metric: params.metric,
                metricValue,
                bucketValuesCount: bucket.values.length,
              });
              break;
            }
          }
        });

        console.log('📊 [Macro Graph] Buckets before averaging:', buckets.map(b => ({
          bucketIndex: b.bucketIndex,
          valuesCount: b.values.length,
          values: b.values,
          range: `${b.bucketStart.toISOString().split('T')[0]} to ${b.bucketEnd.toISOString().split('T')[0]}`,
        })));

        // Calculate average per bucket (round to 1 decimal place)
        const result: ProgressDataPoint[] = buckets.map(bucket => {
          const avg = bucket.values.length > 0
            ? bucket.values.reduce((sum, v) => sum + v, 0) / bucket.values.length
            : 0;

          // Round to 1 decimal place
          const roundedAvg = Math.round(avg * 10) / 10;

          console.log('📊 [Macro Graph] Bucket average:', {
            bucketIndex: bucket.bucketIndex,
            valuesCount: bucket.values.length,
            sum: bucket.values.reduce((sum, v) => sum + v, 0),
            avg,
            roundedAvg,
          });

          // For sodium, convert to mg (multiply by 1000) before returning
          let finalValue = roundedAvg;
          if (params.metric === 'sodium') {
            finalValue = roundedAvg * 1000; // Convert grams to milligrams
          }

          return {
            bucketIndex: bucket.bucketIndex,
            bucketStart: bucket.bucketStart.toISOString().split('T')[0],
            bucketEnd: bucket.bucketEnd.toISOString().split('T')[0],
            value: finalValue,
          };
        });

        console.log('📊 [Macro Graph] Final result:', result);
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
        setData(null);
      });
  }, [user?.id, params.metric, params.days]);

  return { data, loading, error };
}

