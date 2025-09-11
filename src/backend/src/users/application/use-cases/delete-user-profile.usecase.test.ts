import { DeleteUserProfileUseCase } from './delete-user-profile';
import { UserProfileRepository } from '../../domain/repositories/user-profile-repository';
import { Email } from '../../../shared/domain/value-objects/email';

describe('DeleteUserProfileUseCase', () => {
  it('calls repository.deleteProfile with provided email', async () => {
    const repo: UserProfileRepository = {
      deleteProfile: jest.fn(),
      getFavourites: jest.fn(),
      putFavourite: jest.fn(),
      deleteFavourite: jest.fn(),
      getProfile: jest.fn(),
      putProfile: jest.fn(),
    } as any;
    const useCase = new DeleteUserProfileUseCase(repo);
    const email = Email.fromString('user@example.com');
    await useCase.execute(email);
    expect(repo.deleteProfile).toHaveBeenCalledWith(email);
  });
});
