import { RemoveFavouriteUseCase } from './remove-favourite';
import { UserStateRepository } from '../../domain/repositories/user-state-repository';

describe('RemoveFavouriteUseCase', () => {
  it('calls deleteFavourite with provided params', async () => {
    const repo: UserStateRepository = {
      deleteFavourite: jest.fn(),
      putFavourite: jest.fn(),
      getFavourites: jest.fn(),
    } as any;
    const useCase = new RemoveFavouriteUseCase(repo);
    await useCase.execute('user@example.com', '1');
    expect(repo.deleteFavourite).toHaveBeenCalledWith('user@example.com', '1');
  });
});
