export interface MapProvider {
  getCityName(lat: number, lng: number): Promise<string>;
}
