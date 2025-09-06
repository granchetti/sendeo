import { Email } from '../../../shared/domain/value-objects/email';
import { UserProfileRepository } from '../../domain/repositories/user-profile-repository';

export class FavouriteAlreadyExistsError extends Error {
  constructor() {
    super('Favourite already exists');
  }
}

export class AddFavouriteUseCase {
  constructor(private repository: UserProfileRepository) {}

  async execute(email: Email, routeId: string): Promise<void> {
    const existing = await this.repository.getFavourites(email);
    if (existing.some((e) => e === routeId || e === `FAV#${routeId}`)) {
      throw new FavouriteAlreadyExistsError();
    }
    await this.repository.putFavourite(email, routeId);
  }
}
