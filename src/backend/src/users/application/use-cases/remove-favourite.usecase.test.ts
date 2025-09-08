import { RemoveFavouriteUseCase } from './remove-favourite';
import { UserProfileRepository } from '../../domain/repositories/user-profile-repository';
import { Email } from '../../../shared/domain/value-objects/email';

describe('RemoveFavouriteUseCase', () => {
  it('calls deleteFavourite with provided params', async () => {
    const repo: UserProfileRepository = {
      deleteFavourite: jest.fn(),
    } as any;
    const useCase = new RemoveFavouriteUseCase(repo);
    const email = Email.fromString('user@example.com');
    await useCase.execute(email, '1');
    expect(repo.deleteFavourite).toHaveBeenCalledWith(email, '1');
  });
});
