import { Email } from "../../../shared/domain/value-objects/email";
import { UserProfile } from "../../domain/entities/user-profile";
import { UserProfileRepository } from "../../domain/repositories/user-profile-repository";

export class GetUserProfileUseCase {
  constructor(private repository: UserProfileRepository) {}

  async execute(email: Email): Promise<UserProfile> {
    let profile = await this.repository.getProfile(email);
    if (!profile) {
      profile = UserProfile.fromPrimitives({ email: email.Value });
      await this.repository.putProfile(profile);
    }
    return profile;
  }
}
