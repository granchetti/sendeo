export type LatLng = { lat: number; lng: number };

export class Path {
  private readonly encoded: string;

  constructor(encoded: string) {
    if (!encoded) {
      throw new Error("Encoded polyline string is required");
    }
    this.encoded = encoded;
  }

  get Encoded(): string {
    return this.encoded;
  }

}
