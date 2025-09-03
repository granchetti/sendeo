import { Email } from '../../../routes/domain/value-objects/email-value-object';
import { UserProfile } from '../entities/user-profile';

export interface UserProfileRepository {
  putFavourite(email: string, routeId: string): Promise<void>;
  deleteFavourite(email: string, routeId: string): Promise<void>;
  getFavourites(user: string): Promise<string[]>;
  getProfile(email: Email): Promise<UserProfile | null>;
  putProfile(profile: UserProfile): Promise<void>;
}
