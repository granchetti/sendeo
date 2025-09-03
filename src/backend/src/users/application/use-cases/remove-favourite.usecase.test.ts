import { RemoveFavouriteUseCase } from './remove-favourite';
import { UserProfileRepository } from '../../domain/repositories/user-profile-repository';

describe('RemoveFavouriteUseCase', () => {
  it('calls deleteFavourite with provided params', async () => {
    const repo: UserProfileRepository = {
      deleteFavourite: jest.fn(),
    } as any;
    const useCase = new RemoveFavouriteUseCase(repo);
    await useCase.execute('user@example.com', '1');
    expect(repo.deleteFavourite).toHaveBeenCalledWith('user@example.com', '1');
  });
});
