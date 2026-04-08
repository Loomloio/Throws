import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("horses")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch horses" }, { status: 500 });
  }

  const horses = (data || []).map((h) => ({
    id: h.id,
    name: h.name,
    slug: h.slug,
    color: h.color,
    speed: h.speed,
    stamina: h.stamina,
    form: h.form,
    consistency: h.consistency,
    groundPreference: h.ground_preference,
    careerRaces: h.career_races,
    careerWins: h.career_wins,
    careerPlaces: h.career_places,
    careerShows: h.career_shows,
    last5Results: h.last_5_results || [],
  }));

  return NextResponse.json({ horses });
}
