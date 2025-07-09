import { UserStateRepository } from '../../domain/repositories/user-state-repository';

export class RemoveFavouriteUseCase {
  constructor(private repository: UserStateRepository) {}

  async execute(email: string, routeId: string): Promise<void> {
    await this.repository.deleteFavourite(email, routeId);
  }
}
