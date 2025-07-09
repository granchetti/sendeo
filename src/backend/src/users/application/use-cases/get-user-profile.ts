import { Email } from "../../../routes/domain/value-objects/email-value-object";
import { UserProfile } from "../../domain/entities/user-profile";
import { UserStateRepository } from "../../domain/repositories/user-state-repository";

export class GetUserProfileUseCase {
  constructor(private repository: UserStateRepository) {}

  async execute(email: Email): Promise<UserProfile> {
    let profile = await this.repository.getProfile(email);
    if (!profile) {
      profile = UserProfile.fromPrimitives({ email: email.Value });
      await this.repository.putProfile(profile);
    }
    return profile;
  }
}
