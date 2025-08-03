import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import polyline from "@mapbox/polyline";

const bedrock = new BedrockRuntimeClient({});

async function fetchWeather(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m`;
    const res = await fetch(url);
    const data: any = await res.json();
    const t = data?.current?.temperature_2m;
    return typeof t === "number" ? `Current temperature ${t}\u00B0C.` : "";
  } catch {
    return "";
  }
}

export async function describeRoute(
  encodedPath: string,
  modelId = "anthropic.claude-instant-v1"
): Promise<string> {
  if (!encodedPath) return "";
  const coords = polyline.decode(encodedPath);
  const [lat, lng] = coords[0] || [];
  const weather = lat !== undefined ? await fetchWeather(lat, lng) : "";
  const prompt = `You are a helpful assistant. ${weather} Describe the walking route for these coordinates: ${JSON.stringify(coords)}`;
  try {
    const resp = await bedrock.send(
      new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: Buffer.from(JSON.stringify({ prompt, maxTokensToSample: 256 })),
      })
    );
    const text = await new Response(resp.body as any).text();
    const data = JSON.parse(text);
    return data.completion ?? data.output ?? text;
  } catch (err) {
    console.warn("[describeRoute] failed", err);
    return "";
  }
}
