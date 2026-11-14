// Supabase Edge Function: generate-plan
// Powered by Google Gemini API
// Generates personalized workout and nutrition plans for clients.
// The GEMINI_API_KEY is retrieved securely from Deno.env and never exposed to the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

interface RequestBody {
  client_id: string
  goal?: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { client_id, goal } = (await req.json()) as RequestBody
    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Initialize authenticated Supabase client using user's bearer token
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // 1. Fetch client data from Supabase
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .single()

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: "Client not found or access denied", details: clientError }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const effectiveGoal = goal || client.goal || "get fit"

    // 2. Enforce monthly limit (5 AI plans per workspace per month)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { count, error: countError } = await supabase
      .from("ai_plan_generations")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", client.workspace_id)
      .gte("created_at", startOfMonth)

    const usedCount = count ?? 0
    const MONTHLY_LIMIT = 5

    if (usedCount >= MONTHLY_LIMIT) {
      return new Response(
        JSON.stringify({
          error: `Monthly AI plan generation limit reached (${usedCount}/${MONTHLY_LIMIT}). Your limit resets on the 1st of next month.`,
          usage: {
            used: usedCount,
            limit: MONTHLY_LIMIT,
            remaining: 0,
          },
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // 3. Verify Gemini API key is present in Edge Function environment
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error:
            "GEMINI_API_KEY is not configured in Supabase Edge Function Secrets. Set it via Supabase Dashboard or CLI: supabase secrets set GEMINI_API_KEY=your_key",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // 4. Construct prompt for Gemini
    const systemPrompt = `You are an elite certified personal fitness trainer and sports nutritionist.
Create a personalized, science-based workout plan and a daily nutrition plan tailored to the client's profile and goal.
Return ONLY a valid, raw JSON object (strictly adhering to the schema below without markdown backticks, without code fences):
{
  "rationale": "2-3 concise sentences explaining why this routine and calorie target fit this client.",
  "workout_plan": {
    "name": "Creative descriptive plan title",
    "day": "Day schedule (e.g. Monday or Full Body)",
    "exercises": [
      {
        "name": "Exercise name",
        "sets": 3,
        "reps": "10-12"
      }
    ]
  },
  "nutrition_plan": {
    "name": "Creative descriptive diet title",
    "daily_calories": 1800,
    "meals": [
      {
        "name": "Meal name",
        "meal_type": "breakfast",
        "portion": "1 serving",
        "calories": 380,
        "protein_g": 24,
        "carbs_g": 36,
        "fat_g": 14
      }
    ]
  }
}`

    const userPrompt = `Client Details:
- Name: ${client.name}
- Age: ${client.age ?? "Not specified"}
- Gender: ${client.gender ?? "Not specified"}
- Target Goal: ${effectiveGoal}
- Current Fitness Level: ${client.fitness_level}
- Weight: ${client.weight_kg ? `${client.weight_kg} kg` : "Not specified"}
- Height: ${client.height_cm ? `${client.height_cm} cm` : "Not specified"}
- Trainer Notes: ${client.notes || "None"}

Requirements:
1. Workout plan must include 4 distinct exercises suitable for their ${client.fitness_level} level and ${effectiveGoal} goal (e.g., Squat, Push-up, Lunge, Plank, Pull-up, Bench Press, Deadlift, Overhead Press).
2. Nutrition plan must include 4 meals covering: breakfast, lunch, dinner, snack with realistic portion, calories, protein_g, carbs_g, fat_g, adding up closely to the daily_calories target.`

    // 5. Call Gemini API
    const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"]
    let generatedRawText = ""
    let lastError: Error | null = null

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`
        const geminiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.4,
            },
          }),
        })

        if (!geminiRes.ok) {
          const errBody = await geminiRes.text()
          throw new Error(`Gemini API error (${model} - HTTP ${geminiRes.status}): ${errBody}`)
        }

        const data = await geminiRes.json()
        generatedRawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
        if (generatedRawText) break
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.warn(`Model ${model} failed, trying next fallback...`, err)
      }
    }

    if (!generatedRawText) {
      throw lastError || new Error("Failed to receive a valid generation from Gemini API.")
    }

    // Clean any accidental markdown wrappers
    let cleanJson = generatedRawText.trim()
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim()
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/```$/, "").trim()
    }

    const parsedPlan = JSON.parse(cleanJson)

    // 6. Record usage in public.ai_plan_generations
    try {
      await supabase.from("ai_plan_generations").insert({
        workspace_id: client.workspace_id,
        client_id: client.id,
        goal: effectiveGoal,
        workout_plan: parsedPlan.workout_plan,
        nutrition_plan: parsedPlan.nutrition_plan,
        rationale: parsedPlan.rationale,
      })
    } catch (saveErr) {
      console.error("Error saving generation record:", saveErr)
    }

    const updatedRemaining = Math.max(0, MONTHLY_LIMIT - (usedCount + 1))

    return new Response(
      JSON.stringify({
        rationale: parsedPlan.rationale,
        workout_plan: parsedPlan.workout_plan,
        nutrition_plan: parsedPlan.nutrition_plan,
        client: {
          id: client.id,
          name: client.name,
          goal: effectiveGoal,
          fitness_level: client.fitness_level,
        },
        usage: {
          used: usedCount + 1,
          limit: MONTHLY_LIMIT,
          remaining: updatedRemaining,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
