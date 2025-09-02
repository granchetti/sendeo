import { MapProvider } from "../../domain/services/map-provider";

export class GoogleMapsProvider implements MapProvider {
  constructor(private apiKey: string) {}

  async getCityName(lat: number, lng: number): Promise<string> {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${lat},${lng}` +
      `&key=${this.apiKey}` +
      `&result_type=locality|administrative_area_level_3`;

    try {
      const res = await fetch(url);
      const data: any = await res.json();
      const comps = data?.results?.[0]?.address_components ?? [];
      return (
        comps.find((c: any) => c.types.includes("locality"))?.long_name ??
        comps.find((c: any) =>
          c.types.includes("administrative_area_level_3")
        )?.long_name ??
        "Unknown"
      );
    } catch {
      return "Unknown";
    }
  }
}
