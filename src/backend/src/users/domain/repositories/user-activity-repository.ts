export interface ActiveRoute {
  startedAt: number;
  checkpointIndex?: number;
  finishedAt?: number;
}

export interface UserActivityRepository {
  /** Store the active route information for a user */
  putActiveRoute(
    email: string,
    routeId: string,
    startedAt: number,
    checkpointIndex?: number,
    finishedAt?: number
  ): Promise<void>;

  /** Retrieve the active route information for a user */
  getActiveRoute(email: string, routeId: string): Promise<ActiveRoute | null>;

  /** Remove the active route information once the route is finished */
  deleteActiveRoute(email: string, routeId: string): Promise<void>;
}
