export interface UserActivityRepository {
  /** Store the start timestamp for a route execution */
  putRouteStart(email: string, routeId: string, timestamp: number): Promise<void>;

  /** Retrieve the start timestamp previously stored for a route execution */
  getRouteStart(email: string, routeId: string): Promise<number | null>;

  /** Remove the start timestamp once the route is finished */
  deleteRouteStart(email: string, routeId: string): Promise<void>;
}
