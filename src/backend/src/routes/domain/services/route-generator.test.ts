import { RouteGenerator } from "./route-generator";
import type { RouteRepository } from "../repositories/route-repository";
import { Route } from "../entities/route";
import { RouteStatus } from "../value-objects/route-status";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import type { RouteProvider } from "./route-provider";

describe("RouteGenerator", () => {
  it("geocode delegates to provider", async () => {
    const repo: RouteRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue({ items: [] }),
      findByJobId: jest.fn(),
      remove: jest.fn(),
    } as any;
    const provider: RouteProvider = {
      geocode: jest.fn().mockResolvedValue({ lat: 1.23, lng: 4.56 }),
      computeRoutes: jest.fn(),
      snapToRoad: jest.fn(),
      getCityName: jest.fn(),
    };
    const generator = new RouteGenerator(repo, provider);
    const result = await generator.geocode("addr");
    expect(provider.geocode).toHaveBeenCalledWith("addr");
    expect(result).toEqual({ lat: 1.23, lng: 4.56 });
  });

  it("persistRoute saves and returns a generated route", async () => {
    const save = jest.fn();
    const repo: RouteRepository = {
      save,
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue({ items: [] }),
      findByJobId: jest.fn(),
      remove: jest.fn(),
    } as any;
    const provider: RouteProvider = {
      geocode: jest.fn(),
      computeRoutes: jest.fn(),
      snapToRoad: jest.fn(),
      getCityName: jest.fn(),
    };
    const generator = new RouteGenerator(repo, provider);
    const jobId = UUID.generate().toString();
    const route = await generator.persistRoute(jobId, 10, 1000, "poly");
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBeInstanceOf(Route);
    expect(route.distanceKm?.Value).toBe(10);
    expect(route.duration?.Value).toBe(1000);
    expect(route.path?.Encoded).toBe("poly");
    expect(route.status).toBe(RouteStatus.Generated);
  });
});

