import { UserStateRepository } from '../../domain/repositories/user-state-repository';

export class FavouriteAlreadyExistsError extends Error {
  constructor() {
    super('Favourite already exists');
  }
}

export class AddFavouriteUseCase {
  constructor(private repository: UserStateRepository) {}

  async execute(email: string, routeId: string): Promise<void> {
    const existing = await this.repository.getFavourites(email);
    if (existing.some((e) => e === routeId || e === `FAV#${routeId}`)) {
      throw new FavouriteAlreadyExistsError();
    }
    await this.repository.putFavourite(email, routeId);
  }
}
