import { ListRoutesUseCase } from "./list-routes";
import { RouteRepository } from "../../domain/repositories/route-repository";
import { Route } from "../../domain/entities/route";
import { UUID } from "../../../shared/domain/value-objects/uuid";

describe('ListRoutesUseCase', () => {
  it("returns items and nextCursor from repository", async () => {
    const routes = [Route.request({ routeId: UUID.generate() })];
    const repo: RouteRepository = {
      findAll: jest
        .fn()
        .mockResolvedValue({ items: routes, nextCursor: "next" }),
      findById: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      findByJobId: jest.fn(),
    } as any;
    const useCase = new ListRoutesUseCase(repo);
    const result = await useCase.execute({ cursor: "cur", limit: 5 });
    expect(repo.findAll).toHaveBeenCalledWith({ cursor: "cur", limit: 5 });
    expect(result).toEqual({ items: routes, nextCursor: "next" });
  });
});
