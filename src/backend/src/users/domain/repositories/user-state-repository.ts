import { UserProfile } from '../entities/user-profile';
import { Email } from '../value-objects/email-value-object';

export interface UserStateRepository {
  putFavourite(email: string, routeId: string): Promise<void>;
  deleteFavourite(email: string, routeId: string): Promise<void>;
  getFavourites(user: string): Promise<string[]>;
  getProfile(email: Email): Promise<UserProfile | null>;
  putProfile(profile: UserProfile): Promise<void>;
  /**
   * Store the start timestamp for a route execution
   */
  putRouteStart(
    email: string,
    routeId: string,
    timestamp: number
  ): Promise<void>;

  /**
   * Retrieve the start timestamp previously stored for a route execution
   */
  getRouteStart(email: string, routeId: string): Promise<number | null>;

  /**
   * Remove the start timestamp once the route is finished
   */
  deleteRouteStart(email: string, routeId: string): Promise<void>;
}
