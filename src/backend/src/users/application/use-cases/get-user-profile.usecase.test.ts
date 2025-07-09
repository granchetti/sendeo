import { GetUserProfileUseCase } from './get-user-profile';
import { UserStateRepository } from '../../domain/repositories/user-state-repository';
import { UserProfile } from '../../domain/entities/user-profile';
import { Email } from '../../domain/value-objects/email-value-object';

describe('GetUserProfileUseCase', () => {
  it('creates profile when missing', async () => {
    const repo: UserStateRepository = {
      getProfile: jest.fn().mockResolvedValue(null),
      putProfile: jest.fn(),
      putFavourite: jest.fn(),
      deleteFavourite: jest.fn(),
      getFavourites: jest.fn(),
    } as any;
    const useCase = new GetUserProfileUseCase(repo);
    const email = Email.fromString('u@e.com');
    const res = await useCase.execute(email);
    expect(repo.putProfile).toHaveBeenCalled();
    expect(res.email.Value).toBe('u@e.com');
  });
});
