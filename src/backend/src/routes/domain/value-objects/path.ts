// domain/value-objects/path.ts
import polyline from '@mapbox/polyline';
import { LatLng } from './lat-lng';

export class Path {
  constructor(private readonly encoded: string) {
    if (!encoded) {
      throw new Error("Encoded polyline string is required");
    }
  }

  get Encoded(): string {
    return this.encoded;
  }

  get Coordinates(): LatLng[] {
    const decoded = polyline.decode(this.encoded) as [number, number][];
    return decoded.map(([lat, lng]) => LatLng.fromNumbers(lat, lng));
  }

  static fromCoordinates(coords: LatLng[]): Path {
    if (coords.length < 2) {
      throw new Error("The path must have at least two coordinates");
    }
    const arr = coords.map(c => [c.Lat, c.Lng] as [number, number]);
    return new Path(polyline.encode(arr));
  }
}
