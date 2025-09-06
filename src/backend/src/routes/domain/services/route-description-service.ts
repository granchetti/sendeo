import { MapProvider } from "./map-provider";

export interface RouteDescriptionService {
  describe(path: string, provider: MapProvider): Promise<string>;
}
