import { Email } from '../../../shared/domain/value-objects/email-value-object';
import { UserProfile } from '../entities/user-profile';

export interface UserProfileRepository {
  putFavourite(email: Email, routeId: string): Promise<void>;
  deleteFavourite(email: Email, routeId: string): Promise<void>;
  getFavourites(user: Email): Promise<string[]>;
  getProfile(email: Email): Promise<UserProfile | null>;
  putProfile(profile: UserProfile): Promise<void>;
}
