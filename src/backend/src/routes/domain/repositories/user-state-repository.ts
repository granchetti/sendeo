export interface UserStateRepository {
  putFavourite(email: string, routeId: string): Promise<void>;
  deleteFavourite(email: string, routeId: string): Promise<void>;
  getFavourites(user: string): Promise<string[]>;
}