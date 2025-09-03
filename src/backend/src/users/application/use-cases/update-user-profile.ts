import { UserProfile } from "../../domain/entities/user-profile";
import { UserProfileRepository } from "../../domain/repositories/user-profile-repository";


export class UpdateUserProfileUseCase {
  constructor(private repository: UserProfileRepository) {}

  async execute(profile: UserProfile): Promise<void> {
    await this.repository.putProfile(profile);
  }
}
