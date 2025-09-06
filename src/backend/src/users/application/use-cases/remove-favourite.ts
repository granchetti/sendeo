import { Email } from '../../../shared/domain/value-objects/email';
import { UserProfileRepository } from '../../domain/repositories/user-profile-repository';

export class RemoveFavouriteUseCase {
  constructor(private repository: UserProfileRepository) {}

  async execute(email: Email, routeId: string): Promise<void> {
    await this.repository.deleteFavourite(email, routeId);
  }
}
