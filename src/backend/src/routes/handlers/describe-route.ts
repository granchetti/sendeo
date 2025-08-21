import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import polyline from "@mapbox/polyline";
import {
  calcDistanceKm,
  getCityName,
  getGoogleKey,
} from "../interfaces/shared/utils";

const bedrock = new BedrockRuntimeClient({});

async function fetchWeather(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m`;
    const res = await fetch(url);
    const data: any = await res.json();
    const t = data?.current?.temperature_2m;
    return typeof t === "number" ? `The current temperature is ${t}°C.` : "";
  } catch {
    return "";
  }
}

const SYSTEM_PROMPT = `
You are Claude, a senior travel-writer specialized in crafting engaging,
easy-to-read walking-tour briefs.
Always write in a warm, enthusiastic tone, no higher than B2 English level.
Never invent places that are not on or near the provided route.

ORIGINALITY RULES:
- Every call must feel fresh. Do NOT reuse sentences verbatim across outputs.
- Vary sentence structure, verbs, adjectives, and emoji choices each time.
- Rotate the angle of the description (e.g., history, scenery, cafés, local life).
- If similar POIs appear, change their ordering and reasons; keep reasons concise and varied.
`.trim();

function stylePalette(variant: number) {
  switch (variant) {
    case 1:
      return `Style variant #1 — Lexicon: stroll, amble, gentle; Mood: calm & cozy; Emoji set: 🌿☕🙂`;
    case 2:
      return `Style variant #2 — Lexicon: brisk, energizing, pace; Mood: lively & active; Emoji set: 🏃‍♀️⚡🏙️`;
    case 3:
      return `Style variant #3 — Lexicon: heritage, cobbled, landmark; Mood: cultural; Emoji set: 🏛️🧭📸`;
    case 4:
      return `Style variant #4 — Lexicon: green, shaded, stream; Mood: nature-forward; Emoji set: 🍃🌳💧`;
    case 5:
      return `Style variant #5 — Lexicon: scenic, vista, open; Mood: airy & scenic; Emoji set: 🌄🧡👣`;
    default:
      return `Style variant #6 — Lexicon: local bites, cafés, pause; Mood: foodie & relaxed; Emoji set: ☕🥐😊`;
  }
}

function buildUserMessage(
  coords: [number, number][],
  weatherSentence = "",
  variant: number,
  seed: number
) {
  const km = calcDistanceKm(coords).toFixed(1);
  return {
    role: "user" as const,
    content: `
${weatherSentence}

Below is an **ordered array** of GPS coordinates that defines a walking route.
Each element is **[latitude, longitude]** in WGS-84:

${JSON.stringify(coords)}

**The total distance is about ${km} km.**

Use this guidance to keep wording fresh on every call:
- Variation seed: ${seed}. Pick expressions consistent with the style below.
- ${stylePalette(variant)}
- Avoid repeating exact wording you might typically produce for this city.

---

### Please write a single text response following **exactly** this structure:

**Overview (≤ 2 sentences)**  
• Mention total distance (approx.), estimated walking time (assume 4.5 km/h)  
• One-line mood/terrain teaser (e.g. “quiet coastal path”, “lively urban stroll”)

**Points of Interest (max 4)**  
Start each line with “- ”.  
Format: **Name** — reason (≤ 15 words).

**Heads-up section**  
Compact warnings about steep parts, stairs, busy crossings, surfaces, etc.

**Practical tips**  
Good viewpoints, water fountains, cafés, shaded benches… 2–3 items max.

At the end, add an encouraging sentence to motivate the reader to walk this route with emojis.
---

Formatting rules:  
* Use **Markdown**, but no code fences.  
* Wrap lines naturally; do *not* truncate text.  
* Do *not* repeat the GPS data.  
* Stay under **250 words total**.  
* The title must begin with the exact town/city name of the route.
`.trim(),
  };
}

export async function describeRoute(
  encodedPath: string,
  modelId = "eu.anthropic.claude-3-7-sonnet-20250219-v1:0"
) {
  if (!encodedPath) return "";
  const coords = polyline.decode(encodedPath);
  const [lat, lng] = coords[0];
  const weatherSentence = await fetchWeather(lat, lng);

  const googleKey = await getGoogleKey();
  const city = await getCityName(lat, lng, googleKey);
  const seed = Date.now();
  const variant = (seed % 6) + 1;

  const systemPrompt = `
${SYSTEM_PROMPT}

The walk takes place in **${city}**.
The **title must start with “${city}”**.
`.trim();

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    system: systemPrompt,
    messages: [buildUserMessage(coords, weatherSentence, variant, seed)],
    max_tokens: 512,
    temperature: 0.85,
    top_p: 0.95,
    stop_sequences: ["\n\n### End"],
  };

  try {
    const resp = await bedrock.send(
      new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: Buffer.from(JSON.stringify(payload)),
      })
    );

    const raw = await new Response(resp.body as any).text();
    const data = JSON.parse(raw);

    return (
      data.content?.map((c: any) => c.text).join("") ??
      data.completion ??
      data.output ??
      raw
    );
  } catch (err) {
    console.warn("[describeRoute] failed", err);
    return "";
  }
}
