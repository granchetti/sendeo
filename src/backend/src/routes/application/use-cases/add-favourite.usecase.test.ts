import { AddFavouriteUseCase, FavouriteAlreadyExistsError } from './add-favourite';
import { UserStateRepository } from '../../domain/repositories/user-state-repository';

describe('AddFavouriteUseCase', () => {
  const email = 'user@example.com';
  const routeId = '1';
  it('adds favourite when not existing', async () => {
    const repo: UserStateRepository = {
      getFavourites: jest.fn().mockResolvedValue([]),
      putFavourite: jest.fn(),
      deleteFavourite: jest.fn(),
    } as any;
    const useCase = new AddFavouriteUseCase(repo);
    await useCase.execute(email, routeId);
    expect(repo.getFavourites).toHaveBeenCalledWith(email);
    expect(repo.putFavourite).toHaveBeenCalledWith(email, routeId);
  });

  it('throws FavouriteAlreadyExistsError when already saved', async () => {
    const repo: UserStateRepository = {
      getFavourites: jest.fn().mockResolvedValue(['FAV#1']),
      putFavourite: jest.fn(),
      deleteFavourite: jest.fn(),
    } as any;
    const useCase = new AddFavouriteUseCase(repo);
    await expect(useCase.execute(email, routeId)).rejects.toBeInstanceOf(FavouriteAlreadyExistsError);
    expect(repo.putFavourite).not.toHaveBeenCalled();
  });
});
