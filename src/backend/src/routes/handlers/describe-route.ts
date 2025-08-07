import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import polyline from "@mapbox/polyline";

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

const systemMessage = {
  role: "system",
  content: `
You are Claude, a senior travel-writer specialized in crafting engaging,
easy-to-read walking-tour briefs. 
Always write in a warm, enthusiastic tone, no more than B2 English level. 
Never invent places that are not on or near the provided route.`.trim(),
};

function buildUserMessage(coords: any[], weatherSentence = "") {
  return {
    role: "user",
    content: `
${weatherSentence}

Below is an **ordered array** of GPS coordinates that defines a walking route.
Each element is **[latitude, longitude]** in WGS-84:

${JSON.stringify(coords)}

---

### Please write a single text response following **exactly** this structure:

**1. Overview (≤ 2 sentences)**  
• Mention total distance (approx.), estimated walking time (assume 4.5 km/h)  
• One-line mood/terrain teaser (e.g. “quiet coastal path”, “lively urban stroll”)

**2. Turn-by-turn directions (numbered)**  
Short sentences; include street names, squares or obvious landmarks.  
Max 12 steps – merge trivial straight segments.

**3. Points of interest (bullet list, max 4)**  
Name + why it’s worth a stop (≤ 15 words each).

**4. Heads-up section**  
Compact warnings about steep parts, stairs, busy crossings, surfaces, etc.

**5. Practical tips**  
Good viewpoints, water fountains, cafés, shaded benches… 2–3 items max.

---

Formatting rules:  
* Use **Markdown**, but no code fences.  
* Wrap lines naturally; do *not* truncate text.  
* Do *not* repeat the GPS data.  
* Stay under **350 words total**.`.trim(),
  };
}

export async function describeRoute(
  encodedPath: string,
  modelId = "eu.anthropic.claude-3-7-sonnet-20250219-v1:0"
) {
  if (!encodedPath) return "";
  const coords = polyline.decode(encodedPath);
  const weatherSentence = coords[0]
    ? await fetchWeather(coords[0][0], coords[0][1])
    : "";

  const messages = [systemMessage, buildUserMessage(coords, weatherSentence)];

  try {
    const resp = await bedrock.send(
      new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: Buffer.from(
          JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            messages,
            max_tokens: 512,
            temperature: 0.7,
          })
        ),
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
