import { UserProfile } from '../entities/user-profile';

export interface UserStateRepository {
  putFavourite(email: string, routeId: string): Promise<void>;
  deleteFavourite(email: string, routeId: string): Promise<void>;
  getFavourites(user: string): Promise<string[]>;
  getProfile(email: string): Promise<UserProfile | null>;
  putProfile(profile: UserProfile): Promise<void>;}