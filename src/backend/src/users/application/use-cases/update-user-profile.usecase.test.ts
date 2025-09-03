import { UpdateUserProfileUseCase } from './update-user-profile';
import { UserProfileRepository } from '../../domain/repositories/user-profile-repository';
import { UserProfile } from '../../domain/entities/user-profile';

describe('UpdateUserProfileUseCase', () => {
  it('calls repository with provided profile', async () => {
    const repo: UserProfileRepository = {
      putProfile: jest.fn(),
    } as any;
    const useCase = new UpdateUserProfileUseCase(repo);
    const profile = UserProfile.fromPrimitives({ email: 'a@b.com' });
    await useCase.execute(profile);
    expect(repo.putProfile).toHaveBeenCalledWith(profile);
  });
});
