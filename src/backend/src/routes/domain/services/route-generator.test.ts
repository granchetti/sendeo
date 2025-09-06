import { RouteGenerator } from "./route-generator";
import type { RouteRepository } from "../repositories/route-repository";
import { Route } from "../entities/route";
import { RouteStatus } from "../value-objects/route-status";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import { fetchJson } from "../../interfaces/shared/utils";

jest.mock("../../interfaces/shared/utils", () => ({
  fetchJson: jest.fn(),
}));

const mockedFetch = fetchJson as jest.Mock;

describe("RouteGenerator", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("geocode parses coordinate strings without calling API", async () => {
    const repo: RouteRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByJobId: jest.fn(),
      remove: jest.fn(),
    } as any;
    const generator = new RouteGenerator(repo);
    const result = await generator.geocode("1.23, -4.56", "KEY");
    expect(result).toEqual({ lat: 1.23, lng: -4.56 });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("geocode fetches coordinates when not lat,lng", async () => {
    mockedFetch.mockResolvedValue({
      results: [{ geometry: { location: { lat: 5, lng: 6 } } }],
    });
    const generator = new RouteGenerator({} as any);
    const result = await generator.geocode("Some address", "APIKEY");
    expect(mockedFetch).toHaveBeenCalledWith(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        "Some address"
      )}&key=APIKEY`
    );
    expect(result).toEqual({ lat: 5, lng: 6 });
  });

  it("persistRoute saves and returns a generated route", async () => {
    const save = jest.fn();
    const repo: RouteRepository = {
      save,
      findById: jest.fn(),
      findAll: jest.fn(),
      findByJobId: jest.fn(),
      remove: jest.fn(),
    } as any;
    const generator = new RouteGenerator(repo);
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

