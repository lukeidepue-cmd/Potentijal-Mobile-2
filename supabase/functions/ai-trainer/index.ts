// supabase/functions/ai-trainer/index.ts
// Supabase Edge Function for AI Trainer
// This function securely handles OpenAI API calls with the API key stored in Supabase secrets

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the OpenAI API key from Supabase secrets
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("❌ [AI Trainer Edge Function] OPENAI_API_KEY not found in environment");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header to extract the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse the request body
    const { message, conversationHistory } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid message" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`🤖 [AI Trainer Edge Function] Processing message for user: ${user.id}`);

    // Get user context from database
    const userContext = await getUserContext(supabase, user.id);

    // Format context into system prompt
    const systemPrompt = formatUserContextForAI(userContext);

    // Build messages array for OpenAI
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...(conversationHistory || []).map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user",
        content: message,
      },
    ];

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error("❌ [AI Trainer Edge Function] OpenAI API error:", errorData);
      return new Response(
        JSON.stringify({
          error: errorData.error?.message || "Failed to get AI response",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await openaiResponse.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ [AI Trainer Edge Function] Successfully generated response");

    return new Response(
      JSON.stringify({ data: aiResponse }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ [AI Trainer Edge Function] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to get user context from database
async function getUserContext(supabase: any, userId: string) {
  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, sports, primary_sport")
    .eq("id", userId)
    .single();

  // Get recent workouts (last 10)
  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, name, mode, performed_at")
    .eq("user_id", userId)
    .order("performed_at", { ascending: false })
    .limit(10);

  // Get workout details for each workout
  const workoutsWithDetails = await Promise.all(
    (workouts || []).map(async (workout: any) => {
      const { data: exercises } = await supabase
        .from("workout_exercises")
        .select(
          `
          id,
          name,
          exercise_type,
          workout_sets (
            id,
            set_index,
            reps,
            weight,
            attempted,
            made,
            distance,
            time_min,
            avg_time_sec,
            completed,
            points
          )
        `
        )
        .eq("workout_id", workout.id)
        .order("created_at");

      return {
        name: workout.name,
        mode: workout.mode,
        performedAt: workout.performed_at || "",
        exercises: (exercises || []).map((ex: any) => ({
          name: ex.name || "",
          type: ex.exercise_type || "exercise",
          sets: (ex.workout_sets || []).map((set: any) => ({
            reps: set.reps ?? undefined,
            weight: set.weight ?? undefined,
            attempted: set.attempted ?? undefined,
            made: set.made ?? undefined,
            distance: set.distance ?? undefined,
            timeMin: set.time_min ?? undefined,
            avgTimeSec: set.avg_time_sec ?? undefined,
            completed: set.completed ?? undefined,
            points: set.points ?? undefined,
          })),
        })),
      };
    })
  );

  // Get recent games (last 20)
  const { data: games } = await supabase
    .from("games")
    .select("mode, played_at, result, stats, notes")
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .limit(20);

  // Get recent practices (last 20)
  const { data: practices } = await supabase
    .from("practices")
    .select("mode, practiced_at, drill, notes")
    .eq("user_id", userId)
    .order("practiced_at", { ascending: false })
    .limit(20);

  // Get meals for the last 7 days
  const today = new Date();
  const recentMeals = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const { data: meals } = await supabase
      .from("meals")
      .select(
        `
        id,
        date,
        type,
        meal_items (
          food_name,
          servings,
          calories,
          protein,
          carbs,
          fats,
          sugar,
          sodium
        )
      `
      )
      .eq("user_id", userId)
      .eq("date", dateStr);

    if (meals && meals.length > 0) {
      recentMeals.push({
        date: dateStr,
        type: meals[0]?.type || "",
        items: meals.flatMap((meal: any) =>
          (meal.meal_items || []).map((item: any) => ({
            foodName: item.food_name,
            servings: item.servings,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            sugar: item.sugar,
            sodium: item.sodium,
          }))
        ),
      });
    }
  }

  return {
    profile: {
      username: profile?.username || "",
      displayName: profile?.display_name || "",
      sports: profile?.sports || [],
      primarySport: profile?.primary_sport || null,
      bio: profile?.bio || null,
    },
    recentWorkouts: workoutsWithDetails.filter((w) => w !== null),
    recentGames: (games || []).map((game: any) => ({
      mode: game.mode,
      playedAt: game.played_at || "",
      result: game.result || "",
      stats: game.stats || null,
      notes: game.notes || null,
    })),
    recentPractices: (practices || []).map((practice: any) => ({
      mode: practice.mode,
      practicedAt: practice.practiced_at || "",
      drill: practice.drill || "",
      notes: practice.notes || null,
    })),
    recentMeals: recentMeals,
  };
}

// Helper function to format user context into AI prompt
function formatUserContextForAI(context: any): string {
  let prompt = `You are an AI Trainer, a personalized fitness and sports performance coach. Your role is to help athletes improve their performance through data-driven insights and personalized advice.\n\n`;
  
  // Core instructions for the AI
  prompt += `YOUR ROLE AND BEHAVIOR:\n`;
  prompt += `- You are knowledgeable about fitness, sports training, nutrition, and athletic performance\n`;
  prompt += `- You have access to the athlete's complete training history, game performance, practice logs, and nutrition data\n`;
  prompt += `- You provide personalized, actionable advice based on their specific data\n`;
  prompt += `- You are encouraging, supportive, and motivating while being honest about areas for improvement\n`;
  prompt += `- You remember context from the conversation (like injuries, goals, or preferences mentioned)\n`;
  prompt += `- You reference specific workouts, exercises, games, or meals when relevant\n`;
  prompt += `- You provide practical, implementable recommendations\n`;
  prompt += `- Keep responses concise but informative (aim for 2-4 sentences for simple questions, up to a paragraph for complex topics)\n`;
  prompt += `- If asked about medical issues or injuries, recommend consulting a healthcare professional\n`;
  prompt += `- Use the athlete's name (${context.profile.displayName}) when appropriate to personalize responses\n\n`;
  
  prompt += `Here is their profile and recent activity:\n\n`;

  // Profile info
  prompt += `PROFILE:\n`;
  prompt += `- Username: ${context.profile.username}\n`;
  prompt += `- Display Name: ${context.profile.displayName}\n`;
  prompt += `- Sports: ${context.profile.sports.join(", ")}\n`;
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
    context.recentWorkouts.forEach((workout: any, idx: number) => {
      prompt += `${idx + 1}. ${workout.name} (${workout.mode} mode, ${workout.performedAt})\n`;
      workout.exercises.forEach((exercise: any) => {
        prompt += `   - ${exercise.name} (${exercise.type}): ${exercise.sets.length} sets\n`;
        exercise.sets.forEach((set: any, setIdx: number) => {
          const setData: string[] = [];
          if (set.reps !== undefined) setData.push(`${set.reps} reps`);
          if (set.weight !== undefined) setData.push(`${set.weight} lbs`);
          if (set.attempted !== undefined) setData.push(`${set.attempted} attempted`);
          if (set.made !== undefined) setData.push(`${set.made} made`);
          if (set.distance !== undefined) setData.push(`${set.distance} distance`);
          if (set.timeMin !== undefined) setData.push(`${set.timeMin} min`);
          if (set.avgTimeSec !== undefined) setData.push(`${set.avgTimeSec} sec avg`);
          if (set.completed !== undefined) setData.push(set.completed ? "completed" : "not completed");
          if (set.points !== undefined) setData.push(`${set.points} points`);
          if (setData.length > 0) {
            prompt += `     Set ${setIdx + 1}: ${setData.join(", ")}\n`;
          }
        });
      });
    });
    prompt += `\n`;
  }

  // Recent games
  if (context.recentGames.length > 0) {
    prompt += `RECENT GAMES (last ${context.recentGames.length}):\n`;
    context.recentGames.forEach((game: any, idx: number) => {
      prompt += `${idx + 1}. ${game.mode} game (${game.playedAt}): ${game.result}\n`;
      if (game.stats) prompt += `   Stats: ${game.stats}\n`;
      if (game.notes) prompt += `   Notes: ${game.notes}\n`;
    });
    prompt += `\n`;
  }

  // Recent practices
  if (context.recentPractices.length > 0) {
    prompt += `RECENT PRACTICES (last ${context.recentPractices.length}):\n`;
    context.recentPractices.forEach((practice: any, idx: number) => {
      prompt += `${idx + 1}. ${practice.mode} practice (${practice.practicedAt}): ${practice.drill}\n`;
      if (practice.notes) prompt += `   Notes: ${practice.notes}\n`;
    });
    prompt += `\n`;
  }

  // Recent meals
  if (context.recentMeals.length > 0) {
    prompt += `RECENT MEALS (last 7 days):\n`;
    context.recentMeals.forEach((meal: any) => {
      prompt += `- ${meal.date} (${meal.type}): ${meal.items.length} items\n`;
      meal.items.forEach((item: any) => {
        prompt += `  ${item.foodName}: ${item.calories} cal, ${item.protein}g protein, ${item.carbs}g carbs, ${item.fats}g fats\n`;
      });
    });
    prompt += `\n`;
  }

  // Final instructions
  prompt += `\nREMEMBER:\n`;
  prompt += `- Always base your advice on the actual data provided above\n`;
  prompt += `- Reference specific workouts, exercises, games, or meals when relevant\n`;
  prompt += `- If the athlete mentions new information (injuries, goals, preferences), remember it for future responses\n`;
  prompt += `- Provide actionable, specific recommendations they can implement immediately\n`;
  prompt += `- Be encouraging and supportive while being honest about areas for improvement\n`;
  prompt += `- If you notice patterns (e.g., consistent progress, plateaus, imbalances), point them out\n`;
  prompt += `- For nutrition questions, reference their actual meal data when available\n`;
  prompt += `- For training questions, reference their actual workout history and progress\n\n`;

  return prompt;
}

