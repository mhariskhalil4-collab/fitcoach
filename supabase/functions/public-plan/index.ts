// Supabase Edge Function: public-plan
// Returns workout and nutrition plans for a given share_token without requiring authentication.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    let token: string | null = url.searchParams.get("token")

    // If not in query params and method is POST, check body
    if (!token && req.method === "POST") {
      try {
        const body = await req.json()
        if (body && typeof body.token === "string") {
          token = body.token
        }
      } catch {
        // body parsing error, continue to check path
      }
    }

    // Also allow path-based token, e.g. /public-plan/abc123
    if (!token) {
      const parts = url.pathname.split("/").filter(Boolean)
      const last = parts[parts.length - 1]
      if (last && last !== "public-plan") {
        token = last
      }
    }

    if (!token || typeof token !== "string" || !token.trim()) {
      return new Response(JSON.stringify({ error: "Missing required 'token' parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const cleanToken = token.trim()

    // 2. Initialize Supabase admin client with service role key (bypasses RLS for public read-only lookup)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      ""

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 3. Search workout_plans by share_token
    const { data: matchedWp, error: wpErr } = await supabase
      .from("workout_plans")
      .select("id, workspace_id, client_id, name, day, share_token, created_at")
      .eq("share_token", cleanToken)
      .maybeSingle()

    if (wpErr) {
      console.error("[public-plan] Error querying workout_plans:", wpErr)
    }

    // 4. Search nutrition_plans by share_token
    const { data: matchedNp, error: npErr } = await supabase
      .from("nutrition_plans")
      .select("id, workspace_id, client_id, name, daily_calories, share_token, created_at")
      .eq("share_token", cleanToken)
      .maybeSingle()

    if (npErr) {
      console.error("[public-plan] Error querying nutrition_plans:", npErr)
    }

    if (!matchedWp && !matchedNp) {
      return new Response(
        JSON.stringify({ error: "Plan not found or invalid share token." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Identify target client_id
    const targetClientId = matchedWp?.client_id || matchedNp?.client_id

    // 5. Fetch Client details
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, name, goal, fitness_level, age, gender")
      .eq("id", targetClientId)
      .maybeSingle()

    if (clientErr) {
      console.error("[public-plan] Error querying client:", clientErr)
    }

    // 6. Resolve Workout Plan: use matchedWp if available; otherwise find client's latest workout plan
    let activeWp = matchedWp
    if (!activeWp && targetClientId) {
      const { data: fallbackWp } = await supabase
        .from("workout_plans")
        .select("id, workspace_id, client_id, name, day, share_token, created_at")
        .eq("client_id", targetClientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      activeWp = fallbackWp
    }

    // Resolve Nutrition Plan: use matchedNp if available; otherwise find client's latest nutrition plan
    let activeNp = matchedNp
    if (!activeNp && targetClientId) {
      const { data: fallbackNp } = await supabase
        .from("nutrition_plans")
        .select("id, workspace_id, client_id, name, daily_calories, share_token, created_at")
        .eq("client_id", targetClientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      activeNp = fallbackNp
    }

    // 7. Fetch Workout Plan Items & Exercises if activeWp exists
    let workoutPlanData = null
    if (activeWp) {
      const { data: wpItems, error: wpItemsErr } = await supabase
        .from("workout_plan_items")
        .select(`
          id,
          sets,
          reps,
          exercise:exercises (
            id,
            name,
            muscle_group,
            equipment,
            instructions
          )
        `)
        .eq("plan_id", activeWp.id)

      if (wpItemsErr) {
        console.error("[public-plan] Error querying workout_plan_items:", wpItemsErr)
      }

      const formattedExercises = (wpItems || []).map((item: any) => {
        const ex = Array.isArray(item.exercise) ? item.exercise[0] : item.exercise
        return {
          id: ex?.id,
          name: ex?.name || "Exercise",
          muscle_group: ex?.muscle_group || "General",
          equipment: ex?.equipment || "Bodyweight",
          instructions: ex?.instructions || null,
          sets: Number(item.sets) || 3,
          reps: String(item.reps || "10"),
        }
      })

      workoutPlanData = {
        id: activeWp.id,
        name: activeWp.name,
        day: activeWp.day,
        share_token: activeWp.share_token,
        created_at: activeWp.created_at,
        exercises: formattedExercises,
      }
    }

    // 8. Fetch Nutrition Plan Items & Meals if activeNp exists
    let nutritionPlanData = null
    if (activeNp) {
      const { data: npItems, error: npItemsErr } = await supabase
        .from("nutrition_plan_items")
        .select(`
          id,
          portion,
          meal_type,
          meal:meals (
            id,
            name,
            meal_type,
            calories,
            protein_g,
            carbs_g,
            fat_g
          )
        `)
        .eq("plan_id", activeNp.id)

      if (npItemsErr) {
        console.error("[public-plan] Error querying nutrition_plan_items:", npItemsErr)
      }

      const formattedMeals = (npItems || []).map((item: any) => {
        const m = Array.isArray(item.meal) ? item.meal[0] : item.meal
        return {
          id: m?.id,
          name: m?.name || "Meal Item",
          meal_type: item.meal_type || m?.meal_type || "snack",
          portion: item.portion || "1 serving",
          calories: Number(m?.calories) || 0,
          protein_g: Number(m?.protein_g) || 0,
          carbs_g: Number(m?.carbs_g) || 0,
          fat_g: Number(m?.fat_g) || 0,
        }
      })

      nutritionPlanData = {
        id: activeNp.id,
        name: activeNp.name,
        daily_calories: activeNp.daily_calories,
        share_token: activeNp.share_token,
        created_at: activeNp.created_at,
        meals: formattedMeals,
      }
    }

    // 9. Build final response payload
    const payload = {
      client: {
        id: client?.id || targetClientId,
        name: client?.name || "Client",
        goal: client?.goal || "Fitness & Health",
        fitness_level: client?.fitness_level || "General",
        age: client?.age,
        gender: client?.gender,
      },
      workout_plan: workoutPlanData,
      nutrition_plan: nutritionPlanData,
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    })
  } catch (error: any) {
    console.error("[public-plan] Unexpected error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  }
})
