import { UserProfile } from '../entities/user-profile';
import { Email } from '../value-objects/email-value-object';

export interface UserStateRepository {
  putFavourite(email: string, routeId: string): Promise<void>;
  deleteFavourite(email: string, routeId: string): Promise<void>;
  getFavourites(user: string): Promise<string[]>;  getProfile(email: Email): Promise<UserProfile | null>;
  putProfile(profile: UserProfile): Promise<void>;
}
