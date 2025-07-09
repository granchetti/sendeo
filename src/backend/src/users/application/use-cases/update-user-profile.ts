import { UserStateRepository } from '../domain/repositories/user-state-repository';
import { UserProfile } from '../domain/entities/user-profile';

export class UpdateUserProfileUseCase {
  constructor(private repository: UserStateRepository) {}

  async execute(profile: UserProfile): Promise<void> {
    await this.repository.putProfile(profile);
  }
}
