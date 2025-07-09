import { UpdateUserProfileUseCase } from './update-user-profile';
import { UserStateRepository } from '../../domain/repositories/user-state-repository';
import { UserProfile } from '../../domain/entities/user-profile';
import { Email } from '../../domain/value-objects/email-value-object';

describe('UpdateUserProfileUseCase', () => {
  it('calls repository with provided profile', async () => {
    const repo: UserStateRepository = {
      putProfile: jest.fn(),
      getProfile: jest.fn(),
      putFavourite: jest.fn(),
      deleteFavourite: jest.fn(),
      getFavourites: jest.fn(),
    } as any;
    const useCase = new UpdateUserProfileUseCase(repo);
    const profile = UserProfile.fromPrimitives({ email: 'a@b.com' });
    await useCase.execute(profile);
    expect(repo.putProfile).toHaveBeenCalledWith(profile);
  });
});
