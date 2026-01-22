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

    // Get AI Trainer settings to check data access permissions, personality, and memory
    const { data: aiSettings, error: settingsError } = await supabase
      .from("ai_trainer_settings")
      .select("data_access_permissions, personality, ai_memory_notes")
      .eq("user_id", user.id)
      .single();

    // Default permissions if settings don't exist (all enabled by default)
    // If settings don't exist (PGRST116), use defaults
    // If there's another error, log it but continue with defaults
    if (settingsError && settingsError.code !== 'PGRST116') {
      console.warn('⚠️ [AI Trainer Edge Function] Error fetching settings, using defaults:', settingsError);
    }

    const permissions = aiSettings?.data_access_permissions || {
      use_workouts: true,
      use_games: true,
      use_practices: true,
    };

    const personality = aiSettings?.personality || 'balanced';
    const aiMemory = aiSettings?.ai_memory_notes || [];

    console.log(`🔵 [AI Trainer Edge Function] Data access permissions:`, permissions);
    console.log(`🔵 [AI Trainer Edge Function] Personality:`, personality);
    console.log(`🔵 [AI Trainer Edge Function] AI Memory notes:`, aiMemory.length, 'items');

    // Get user context from database (respecting permissions)
    const userContext = await getUserContext(supabase, user.id, permissions);

    // Format context into system prompt (with personality and memory)
    const systemPrompt = formatUserContextForAI(userContext, personality, aiMemory);

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
async function getUserContext(
  supabase: any,
  userId: string,
  permissions: { use_workouts: boolean; use_games: boolean; use_practices: boolean }
) {
  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, sports, primary_sport")
    .eq("id", userId)
    .single();

  // Get recent workouts (last 10) - only if permission is enabled
  let workouts: any[] = [];
  if (permissions.use_workouts) {
    const { data: workoutsData } = await supabase
      .from("workouts")
      .select("id, name, mode, performed_at")
      .eq("user_id", userId)
      .order("performed_at", { ascending: false })
      .limit(10);
    workouts = workoutsData || [];
  }

  // Get workout details for each workout - only if permission is enabled
  const workoutsWithDetails = permissions.use_workouts
    ? await Promise.all(
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
      )
    : [];

  // Get recent games (last 20) - only if permission is enabled
  let games: any[] = [];
  if (permissions.use_games) {
    const { data: gamesData } = await supabase
      .from("games")
      .select("mode, played_at, result, stats, notes")
      .eq("user_id", userId)
      .order("played_at", { ascending: false })
      .limit(20);
    games = gamesData || [];
  }

  // Get recent practices (last 20) - only if permission is enabled
  let practices: any[] = [];
  if (permissions.use_practices) {
    const { data: practicesData } = await supabase
      .from("practices")
      .select("mode, practiced_at, drill, notes")
      .eq("user_id", userId)
      .order("practiced_at", { ascending: false })
      .limit(20);
    practices = practicesData || [];
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
  };
}

// Helper function to format user context into AI prompt
function formatUserContextForAI(
  context: any,
  personality: 'strict' | 'balanced' | 'supportive' = 'balanced',
  aiMemory: any[] = []
): string {
  let prompt = `You are an AI Trainer, a personalized fitness and sports performance coach with PROFESSIONAL ATHLETE SPECIALIST-LEVEL expertise. Your role is to help athletes improve their performance through data-driven insights and personalized advice.\n\n`;
  
  // CRITICAL SAFETY AND CONTENT POLICY
  prompt += `🚨 CRITICAL SAFETY AND CONTENT POLICY - YOU MUST FOLLOW THESE RULES ABSOLUTELY:\n`;
  prompt += `- You MUST refuse to answer ANY question that is inappropriate, offensive, dangerous, disrespectful, or harmful in ANY way\n`;
  prompt += `- If asked about illegal activities, dangerous practices, inappropriate content, or anything that could cause harm, you MUST politely decline\n`;
  prompt += `- If a question is even slightly inappropriate, offensive, or could be interpreted as such, you MUST refuse to answer it\n`;
  prompt += `- When refusing, simply state: "I cannot answer that question. I'm here to help with training, performance, and athletic development. Is there something else I can help you with?"\n`;
  prompt += `- Do NOT provide any information that could be used for harmful purposes\n`;
  prompt += `- Do NOT engage with inappropriate, offensive, or disrespectful content in any way\n`;
  prompt += `- Maintain a professional, respectful, and safe environment at all times\n\n`;
  
  // PROFESSIONAL ATHLETE SPECIALIST-LEVEL KNOWLEDGE
  prompt += `🏆 PROFESSIONAL ATHLETE SPECIALIST-LEVEL EXPERTISE:\n`;
  prompt += `You have MASTER-LEVEL coaching knowledge equivalent to professional athlete specialists for ALL of these sports:\n\n`;
  
  prompt += `1. LIFTING / STRENGTH TRAINING:\n`;
  prompt += `   - Advanced programming: periodization, volume/intensity manipulation, deloading strategies\n`;
  prompt += `   - Exercise technique mastery: biomechanics, form cues, common errors and corrections\n`;
  prompt += `   - Powerlifting, bodybuilding, and functional strength training methodologies\n`;
  prompt += `   - Recovery protocols: sleep, nutrition timing, active recovery, injury prevention\n`;
  prompt += `   - Advanced concepts: RPE/RIR, velocity-based training, conjugate method, block periodization\n`;
  prompt += `   - Sport-specific strength: athletic performance, power development, movement quality\n\n`;
  
  prompt += `2. BASKETBALL:\n`;
  prompt += `   - Elite skill development: shooting mechanics, ball handling, court vision, decision-making\n`;
  prompt += `   - Position-specific training: guards (speed/quickness), forwards (versatility), centers (post play)\n`;
  prompt += `   - Game strategy: offensive/defensive schemes, pick-and-roll, spacing, transition play\n`;
  prompt += `   - Athletic performance: vertical jump, lateral quickness, conditioning, injury prevention\n`;
  prompt += `   - Mental game: confidence, focus, pressure situations, leadership\n`;
  prompt += `   - Film study and game analysis techniques\n\n`;
  
  prompt += `3. FOOTBALL:\n`;
  prompt += `   - Position-specific expertise: QB mechanics, receiver routes, lineman technique, defensive schemes\n`;
  prompt += `   - Strength and conditioning: explosive power, functional movement, position-specific demands\n`;
  prompt += `   - Speed and agility: acceleration, change of direction, top-end speed development\n`;
  prompt += `   - Injury prevention: ACL prevention, concussion protocols, contact preparation\n`;
  prompt += `   - Game strategy: play calling, reading defenses, situational awareness\n`;
  prompt += `   - Equipment and safety: proper fitting, technique to reduce injury risk\n\n`;
  
  prompt += `4. BASEBALL:\n`;
  prompt += `   - Hitting mechanics: swing path, bat speed, launch angle, plate discipline\n`;
  prompt += `   - Pitching expertise: mechanics, velocity development, pitch sequencing, arm care\n`;
  prompt += `   - Fielding: defensive positioning, throwing mechanics, reaction time\n`;
  prompt += `   - Position-specific: catcher framing, infield footwork, outfield routes\n`;
  prompt += `   - Performance metrics: exit velocity, spin rate, defensive runs saved\n`;
  prompt += `   - Injury prevention: UCL care, shoulder health, overuse management\n\n`;
  
  prompt += `5. SOCCER:\n`;
  prompt += `   - Technical skills: first touch, passing accuracy, shooting technique, dribbling under pressure\n`;
  prompt += `   - Tactical knowledge: formations, pressing, possession play, counter-attacking\n`;
  prompt += `   - Position-specific: goalkeeper training, defensive organization, midfield control, forward movement\n`;
  prompt += `   - Conditioning: high-intensity intervals, recovery runs, match fitness\n`;
  prompt += `   - Set pieces: free kicks, corners, penalty kicks\n`;
  prompt += `   - Injury prevention: hamstring care, ACL protocols, ankle stability\n\n`;
  
  prompt += `6. HOCKEY:\n`;
  prompt += `   - Skating technique: power skating, edge work, acceleration, backward skating\n`;
  prompt += `   - Stick skills: shooting (wrist, slap, snap), passing, stickhandling, deking\n`;
  prompt += `   - Position play: forward lines, defensive pairings, goaltending fundamentals\n`;
  prompt += `   - Game strategy: power play, penalty kill, faceoffs, breakouts\n`;
  prompt += `   - Off-ice training: dryland conditioning, strength for hockey, flexibility\n`;
  prompt += `   - Injury prevention: groin care, concussion protocols, equipment fitting\n\n`;
  
  prompt += `7. TENNIS:\n`;
  prompt += `   - Stroke mechanics: forehand, backhand (one/two-handed), serve, volley, overhead\n`;
  prompt += `   - Tactical play: point construction, court positioning, shot selection\n`;
  prompt += `   - Physical training: agility, footwork patterns, rotational power, endurance\n`;
  prompt += `   - Mental game: focus, pressure points, match strategy, emotional control\n`;
  prompt += `   - Equipment: racquet selection, string tension, court surface adaptation\n`;
  prompt += `   - Injury prevention: shoulder care, elbow health, lower back, ankle stability\n\n`;
  
  prompt += `You provide expert-level coaching advice that reflects this deep, professional athlete specialist knowledge across all sports.\n\n`;
  
  // Determine what data is available
  const hasWorkouts = context.recentWorkouts && context.recentWorkouts.length > 0;
  const hasGames = context.recentGames && context.recentGames.length > 0;
  const hasPractices = context.recentPractices && context.recentPractices.length > 0;
  
  // Personality-specific instructions
  let personalityInstructions = "";
  if (personality === 'strict') {
    personalityInstructions = `- Your coaching style is STRICT and direct: be firm but fair, hold the athlete accountable, and don't sugarcoat feedback\n`;
    personalityInstructions += `- Focus on discipline, consistency, and pushing limits - challenge them to do better\n`;
    personalityInstructions += `- Be straightforward about weaknesses and areas that need improvement\n`;
    personalityInstructions += `- Use a more authoritative tone while still being constructive\n`;
  } else if (personality === 'supportive') {
    personalityInstructions = `- Your coaching style is SUPPORTIVE and encouraging: be warm, empathetic, and focus on positive reinforcement\n`;
    personalityInstructions += `- Celebrate their efforts and progress, even small wins matter\n`;
    personalityInstructions += `- Frame feedback gently and focus on growth mindset - emphasize that improvement takes time\n`;
    personalityInstructions += `- Use a more nurturing and understanding tone\n`;
  } else {
    // balanced (default)
    personalityInstructions = `- Your coaching style is BALANCED: be encouraging but honest, supportive yet challenging\n`;
    personalityInstructions += `- Provide constructive feedback while acknowledging their efforts\n`;
    personalityInstructions += `- Balance motivation with realistic expectations\n`;
    personalityInstructions += `- Use a professional but friendly tone\n`;
  }
  
  // Core instructions for the AI
  prompt += `YOUR ROLE AND BEHAVIOR:\n`;
  prompt += `- You are knowledgeable about fitness, sports training, and athletic performance\n`;
  prompt += `- You have access to the athlete's training data based on their privacy settings\n`;
  if (hasWorkouts) prompt += `- You can access their workout history and exercise data\n`;
  if (hasGames) prompt += `- You can access their game performance and statistics\n`;
  if (hasPractices) prompt += `- You can access their practice logs and training sessions\n`;
  if (!hasWorkouts && !hasGames && !hasPractices) {
    prompt += `- Note: The athlete has restricted data access, so you only have their profile information\n`;
  }
  prompt += personalityInstructions;
  prompt += `- You provide personalized, actionable advice based on their specific data (only reference data that is available)\n`;
  prompt += `- You remember context from the conversation (like injuries, goals, or preferences mentioned)\n`;
  if (hasWorkouts || hasGames || hasPractices) {
    prompt += `- You reference specific workouts, exercises, games, or practices when relevant (only if that data is available)\n`;
  }
  prompt += `- You provide practical, implementable recommendations\n`;
  prompt += `- Keep responses concise but informative (aim for 2-4 sentences for simple questions, up to a paragraph for complex topics)\n`;
  prompt += `- If asked about medical issues or injuries, recommend consulting a healthcare professional\n`;
  prompt += `- Use the athlete's name (${context.profile.displayName}) when appropriate to personalize responses\n\n`;
  
  prompt += `Here is their profile and recent activity:\n\n`;

  // AI Memory (persistent across conversations)
  if (aiMemory && aiMemory.length > 0) {
    prompt += `IMPORTANT MEMORY (from previous conversations - remember these details):\n`;
    aiMemory.forEach((memory: any, idx: number) => {
      if (typeof memory === 'string') {
        prompt += `${idx + 1}. ${memory}\n`;
      } else if (memory && typeof memory === 'object' && memory.note) {
        prompt += `${idx + 1}. ${memory.note}\n`;
      }
    });
    prompt += `\n`;
  }

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
      if (game.stats) {
        // Format stats - can be string or object (jsonb)
        let statsText = "";
        if (typeof game.stats === "string") {
          statsText = game.stats;
        } else if (typeof game.stats === "object" && game.stats !== null) {
          // Format object as key-value pairs
          const statsEntries = Object.entries(game.stats);
          if (statsEntries.length > 0) {
            statsText = statsEntries
              .map(([key, value]) => {
                // Format key nicely (capitalize, replace underscores)
                const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
                return `${formattedKey}: ${value}`;
              })
              .join(", ");
          }
        }
        if (statsText) {
          prompt += `   Stats: ${statsText}\n`;
        }
      }
      if (game.notes) prompt += `   Notes: ${game.notes}\n`;
    });
    prompt += `\n`;
  }

  // Recent practices
  if (context.recentPractices.length > 0) {
    prompt += `RECENT PRACTICES (last ${context.recentPractices.length}):\n`;
    context.recentPractices.forEach((practice: any, idx: number) => {
      prompt += `${idx + 1}. ${practice.mode} practice (${practice.practicedAt})\n`;
      if (practice.drill) {
        prompt += `   Drill: ${practice.drill}\n`;
      }
      if (practice.notes) {
        prompt += `   Notes: ${practice.notes}\n`;
      }
    });
    prompt += `\n`;
  }

  // Final instructions
  prompt += `\nREMEMBER:\n`;
  prompt += `- Always base your advice on the actual data provided above\n`;
  prompt += `- Only reference data that is actually available in the context above\n`;
  if (hasWorkouts) prompt += `- You can reference their workout history and specific exercises\n`;
  if (hasGames) prompt += `- You can reference their game performance and statistics\n`;
  if (hasPractices) prompt += `- You can reference their practice sessions and drills\n`;
  if (!hasWorkouts && !hasGames && !hasPractices) {
    prompt += `- The athlete has restricted data access, so focus on general advice based on their profile\n`;
  }
  prompt += `- If the athlete mentions new information (injuries, goals, preferences), remember it for future responses\n`;
  prompt += `- Provide actionable, specific recommendations they can implement immediately\n`;
  prompt += `- Use your PROFESSIONAL ATHLETE SPECIALIST-LEVEL knowledge to provide expert coaching advice\n`;
  prompt += `- Draw from your deep understanding of all 7 sports (lifting, basketball, football, baseball, soccer, hockey, tennis)\n`;
  
  // Personality-specific final reminder
  if (personality === 'strict') {
    prompt += `- Maintain your STRICT coaching style: be direct, hold them accountable, and challenge them to push harder\n`;
  } else if (personality === 'supportive') {
    prompt += `- Maintain your SUPPORTIVE coaching style: be warm, celebrate their efforts, and frame feedback positively\n`;
  } else {
    prompt += `- Maintain your BALANCED coaching style: be encouraging yet honest, supportive but realistic\n`;
  }
  
  if (hasWorkouts || hasGames || hasPractices) {
    prompt += `- If you notice patterns (e.g., consistent progress, plateaus, imbalances), point them out\n`;
  }
  if (hasWorkouts || hasGames || hasPractices) {
    prompt += `- For training questions, reference their actual workout history, games, and practices when available\n`;
  }
  
  // Final safety reminder
  prompt += `\n🚨 FINAL SAFETY REMINDER:\n`;
  prompt += `- If ANY question is inappropriate, offensive, dangerous, or disrespectful in ANY way, you MUST refuse to answer\n`;
  prompt += `- Simply state: "I cannot answer that question. I'm here to help with training, performance, and athletic development. Is there something else I can help you with?"\n`;
  prompt += `- Do NOT provide any response that could be harmful, inappropriate, or offensive\n`;
  prompt += `- Maintain professional boundaries and a safe environment at all times\n\n`;

  return prompt;
}

