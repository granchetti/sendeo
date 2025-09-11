import { GetUserProfileUseCase } from './get-user-profile';
import { UserProfileRepository } from '../../domain/repositories/user-profile-repository';
import { Email } from '../../../shared/domain/value-objects/email';

describe('GetUserProfileUseCase', () => {
  it('creates profile when missing', async () => {
    const repo: UserProfileRepository = {
      getProfile: jest.fn().mockResolvedValue(null),
      putProfile: jest.fn(),
      getFavourites: jest.fn(),
      putFavourite: jest.fn(),
      deleteFavourite: jest.fn(),
      deleteProfile: jest.fn(),
    } as any;
    const useCase = new GetUserProfileUseCase(repo);
    const email = Email.fromString('u@e.com');
    const res = await useCase.execute(email);
    expect(repo.putProfile).toHaveBeenCalled();
    expect(res.email.Value).toBe('u@e.com');
  });
});
