import { Email } from "../../../shared/domain/value-objects/email";
import { UserProfileRepository } from "../../domain/repositories/user-profile-repository";

export class DeleteUserProfileUseCase {
  constructor(private repository: UserProfileRepository) {}

  async execute(email: Email): Promise<void> {
    await this.repository.deleteProfile(email);
  }
}
