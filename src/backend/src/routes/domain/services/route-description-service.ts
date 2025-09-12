export interface RouteDescriptionService {
  describe(path: string): Promise<string>;
}
