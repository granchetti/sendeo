import { ValidationError } from "../../../shared/errors";

export class LatLng {
  private constructor(private readonly lat: number, private readonly lng: number) {
    if (lat < -90 || lat > 90) {
      throw new ValidationError("Latitude must be between -90 and 90");
    }
    if (lng < -180 || lng > 180) {
      throw new ValidationError("Longitude must be between -180 and 180");
    }
  }

  static fromNumbers(lat: number, lng: number): LatLng {
    return new LatLng(lat, lng);
  }

  get Lat(): number {
    return this.lat;
  }

  get Lng(): number {
    return this.lng;
  }
}
