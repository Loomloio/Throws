import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const FALLBACK_MESSAGES = [
  "What a race! The winner stormed home to take it convincingly.",
  "Close finish at the wire — the crowd goes wild.",
  "The favourite couldn't hold on as the field came charging.",
  "A dominant display from the winner. Form held up today.",
  "The outsider came from behind to steal it at the death.",
];

/**
 * Generate AI race commentary using Claude API.
 * Falls back to template messages if API unavailable.
 */
export async function generateRaceCommentary(
  raceNumber: number,
  distance: number,
  ground: string,
  entries: { horseName: string; finishPosition: number; margin: number; odds: number }[]
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const top3 = entries.filter(e => e.finishPosition <= 3).sort((a, b) => a.finishPosition - b.finishPosition);
  const winner = top3[0];
  const isUpset = winner && winner.odds > 8;

  // Try Claude API
  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{
          role: "user",
          content: `You are a horse racing commentator for throws.gg, a crypto betting platform. Write a 1-2 sentence race summary. Be punchy, casual, slightly degen. No emojis.

Race #${raceNumber}: ${distance}m on ${ground} ground
1st: ${top3[0]?.horseName} (${top3[0]?.odds.toFixed(2)} odds)
2nd: ${top3[1]?.horseName} (${top3[1]?.margin.toFixed(1)}L behind)
3rd: ${top3[2]?.horseName}
${isUpset ? "This was a big upset — the winner was a longshot." : ""}`,
        }],
      });

      const text = message.content[0];
      if (text.type === "text" && text.text) {
        return text.text.trim();
      }
    } catch (err) {
      console.error("Commentary API failed:", err);
    }
  }

  // Fallback template
  if (isUpset) {
    return `${winner.horseName} pulls off a shock result at ${winner.odds.toFixed(2)} odds! ${top3[1]?.horseName} had to settle for second.`;
  }

  return FALLBACK_MESSAGES[raceNumber % FALLBACK_MESSAGES.length];
}

/**
 * Generate and store commentary for a settled race, post to chat.
 */
export async function postRaceCommentary(raceId: string) {
  const supabase = createAdminClient();

  const { data: race } = await supabase
    .from("races")
    .select("race_number, distance, ground")
    .eq("id", raceId)
    .single();

  const { data: entries } = await supabase
    .from("race_entries")
    .select("finish_position, margin, opening_odds, horses(name)")
    .eq("race_id", raceId)
    .order("finish_position", { ascending: true });

  if (!race || !entries) return;

  const formatted = entries.map(e => ({
    horseName: (e.horses as unknown as { name: string })?.name || "Unknown",
    finishPosition: e.finish_position || 99,
    margin: e.margin ? parseFloat(String(e.margin)) : 0,
    odds: parseFloat(String(e.opening_odds)),
  }));

  const commentary = await generateRaceCommentary(
    race.race_number,
    race.distance,
    race.ground,
    formatted
  );

  // Store on race
  await supabase
    .from("races")
    .update({ commentary })
    .eq("id", raceId);

  // Post to chat
  await supabase.from("chat_messages").insert({
    user_id: null,
    username: "throws.gg",
    message: `Race #${race.race_number} — ${commentary}`,
    is_system: true,
  });
}
