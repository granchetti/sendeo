type LatLng = { lat: number; lng: number };

export class Path {
  private readonly coordinates: LatLng[];

  constructor(coordinates: LatLng[]) {
    if (!coordinates || coordinates.length < 2)
      throw new Error("The path must have at least two coordinates");
    this.coordinates = [...coordinates];
  }

  get Coordinates(): LatLng[] {
    return [...this.coordinates];
  }
}
