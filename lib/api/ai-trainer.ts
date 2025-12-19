/**
 * AI Trainer API
 * Functions for aggregating user data and communicating with AI
 * 
 * NOTE: The actual OpenAI API calls are handled by a Supabase Edge Function
 * to keep the API key secure. The Edge Function is located at:
 * supabase/functions/ai-trainer/index.ts
 */

import { supabase } from '../supabase';

export interface UserContextData {
  profile: {
    username: string;
    displayName: string;
    sports: string[];
    primarySport: string | null;
    bio: string | null;
  };
  recentWorkouts: Array<{
    name: string;
    mode: string;
    performedAt: string;
    exercises: Array<{
      name: string;
      type: string;
      sets: Array<{
        reps?: number;
        weight?: number;
        attempted?: number;
        made?: number;
        distance?: number;
        timeMin?: number;
        avgTimeSec?: number;
        completed?: boolean;
        points?: number;
      }>;
    }>;
  }>;
  recentGames: Array<{
    mode: string;
    playedAt: string;
    result: string;
    stats: string | null;
    notes: string | null;
  }>;
  recentPractices: Array<{
    mode: string;
    practicedAt: string;
    drill: string;
    notes: string | null;
  }>;
  recentMeals: Array<{
    date: string;
    type: string;
    items: Array<{
      foodName: string;
      servings: number;
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      sugar: number;
      sodium: number;
    }>;
  }>;
}

/**
 * Format user context into a prompt for the AI
 * NOTE: This function is now only used for reference/documentation.
 * The actual formatting happens in the Supabase Edge Function.
 */
export function formatUserContextForAI(context: UserContextData): string {
  let prompt = `You are an AI Trainer helping an athlete improve their performance. Here is their profile and recent activity:\n\n`;

  // Profile info
  prompt += `PROFILE:\n`;
  prompt += `- Username: ${context.profile.username}\n`;
  prompt += `- Display Name: ${context.profile.displayName}\n`;
  prompt += `- Sports: ${context.profile.sports.join(', ')}\n`;
  if (context.profile.primarySport) {
    prompt += `- Primary Sport: ${context.profile.primarySport}\n`;
  }
  if (context.profile.bio) {
    prompt += `- Bio: ${context.profile.bio}\n`;
  }
  prompt += `\n`;

  // Recent workouts
  if (context.recentWorkouts.length > 0) {
    prompt += `RECENT WORKOUTS (last ${context.recentWorkouts.length}):\n`;
    context.recentWorkouts.forEach((workout, idx) => {
      prompt += `${idx + 1}. ${workout.name} (${workout.mode} mode, ${workout.performedAt})\n`;
      workout.exercises.forEach((exercise) => {
        prompt += `   - ${exercise.name} (${exercise.type}): ${exercise.sets.length} sets\n`;
        exercise.sets.forEach((set, setIdx) => {
          const setData: string[] = [];
          if (set.reps !== undefined) setData.push(`${set.reps} reps`);
          if (set.weight !== undefined) setData.push(`${set.weight} lbs`);
          if (set.attempted !== undefined) setData.push(`${set.attempted} attempted`);
          if (set.made !== undefined) setData.push(`${set.made} made`);
          if (set.distance !== undefined) setData.push(`${set.distance} distance`);
          if (set.timeMin !== undefined) setData.push(`${set.timeMin} min`);
          if (set.avgTimeSec !== undefined) setData.push(`${set.avgTimeSec} sec avg`);
          if (set.completed !== undefined) setData.push(set.completed ? 'completed' : 'not completed');
          if (set.points !== undefined) setData.push(`${set.points} points`);
          if (setData.length > 0) {
            prompt += `     Set ${setIdx + 1}: ${setData.join(', ')}\n`;
          }
        });
      });
    });
    prompt += `\n`;
  }

  // Recent games
  if (context.recentGames.length > 0) {
    prompt += `RECENT GAMES (last ${context.recentGames.length}):\n`;
    context.recentGames.forEach((game, idx) => {
      prompt += `${idx + 1}. ${game.mode} game (${game.playedAt}): ${game.result}\n`;
      if (game.stats) prompt += `   Stats: ${game.stats}\n`;
      if (game.notes) prompt += `   Notes: ${game.notes}\n`;
    });
    prompt += `\n`;
  }

  // Recent practices
  if (context.recentPractices.length > 0) {
    prompt += `RECENT PRACTICES (last ${context.recentPractices.length}):\n`;
    context.recentPractices.forEach((practice, idx) => {
      prompt += `${idx + 1}. ${practice.mode} practice (${practice.practicedAt}): ${practice.drill}\n`;
      if (practice.notes) prompt += `   Notes: ${practice.notes}\n`;
    });
    prompt += `\n`;
  }

  // Recent meals
  if (context.recentMeals.length > 0) {
    prompt += `RECENT MEALS (last 7 days):\n`;
    context.recentMeals.forEach((meal) => {
      prompt += `- ${meal.date} (${meal.type}): ${meal.items.length} items\n`;
      meal.items.forEach((item) => {
        prompt += `  ${item.foodName}: ${item.calories} cal, ${item.protein}g protein, ${item.carbs}g carbs, ${item.fats}g fats\n`;
      });
    });
    prompt += `\n`;
  }

  prompt += `Based on this information, provide personalized advice, insights, and recommendations to help this athlete improve. `;
  prompt += `You should reference their specific workouts, games, practices, and diet when giving advice. `;
  prompt += `If they mention new information (like injuries), remember it for future conversations. `;
  prompt += `Be encouraging, specific, and actionable in your responses.\n\n`;

  return prompt;
}

/**
 * Send a message to the AI Trainer via Supabase Edge Function
 * This securely calls the OpenAI API through our backend, keeping the API key safe
 */
export async function sendMessageToAI(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<{ data: string | null; error: any }> {
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('❌ [AI Trainer] Failed to get session:', sessionError);
      return { data: null, error: { message: 'User not authenticated' } };
    }

    console.log('🤖 [AI Trainer] Sending message to AI via Edge Function...');

    // Get the Supabase URL from the client
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('❌ [AI Trainer] Supabase URL not configured');
      return { data: null, error: { message: 'Service not configured' } };
    }

    // Call the Supabase Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-trainer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        message,
        conversationHistory,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [AI Trainer] Edge Function error:', errorData);
      return { data: null, error: { message: errorData.error || 'Failed to get AI response' } };
    }

    const data = await response.json();
    const aiResponse = data.data;

    if (!aiResponse) {
      return { data: null, error: { message: 'No response from AI' } };
    }

    console.log('✅ [AI Trainer] Received AI response');
    return { data: aiResponse, error: null };
  } catch (error: any) {
    console.error('❌ [AI Trainer] Error sending message:', error);
    return { data: null, error };
  }
}

