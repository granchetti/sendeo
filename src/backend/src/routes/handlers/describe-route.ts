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

export async function describeRoute(
  encodedPath: string,
  modelId = "anthropic.claude-3-sonnet-20240229-v1"
): Promise<string> {
  if (!encodedPath) return "";
  const coords = polyline.decode(encodedPath);
  const [startLat, startLng] = coords[0] ?? [];
  const weather =
    startLat != null ? await fetchWeather(startLat, startLng) : "";

  const messages = [
    {
      role: "user",
      content: `
You are an expert urban walking guide. ${weather}
I will provide you with a walking route defined by this array of GPS coordinates (latitude, longitude):
${JSON.stringify(coords)}

Please generate:
1. A concise summary stating the total distance and estimated walking time.
2. Step-by-step numbered directions.
3. Street names or notable landmarks.
4. Highlights of points of interest.
5. Any warnings about elevation or obstacles.
6. Practical tips (rest stops, viewpoints).

Return in clear, friendly paragraph format.
`.trim(),
    },
  ];

  try {
    const resp = await bedrock.send(
      new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: Buffer.from(
          JSON.stringify({
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
