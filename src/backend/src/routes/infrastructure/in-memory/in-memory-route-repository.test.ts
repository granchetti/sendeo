import { InMemoryRouteRepository } from "./in-memory-route-repository";
import { Route } from "../../domain/entities/route-entity";
import { UUID } from "../../../shared/domain/value-objects/uuid-value-object";
import { DistanceKm } from "../../domain/value-objects/distance-value-object";
import { Duration } from "../../domain/value-objects/duration-value-object";
import { Path } from "../../domain/value-objects/path-value-object";
import { LatLng } from "../../domain/value-objects/lat-lng-value-object";

describe("InMemoryRouteRepository", () => {
  let repo: InMemoryRouteRepository;

  beforeEach(() => {
    repo = new InMemoryRouteRepository();
  });

  it("saves and retrieves a route by id", async () => {
    const route = Route.request({ routeId: UUID.generate() });
    route.generate(
      new DistanceKm(3),
      new Duration(300),
      Path.fromCoordinates([
        LatLng.fromNumbers(0, 0),
        LatLng.fromNumbers(1, 1),
      ])
    );

    await repo.save(route);
    const fetched = await repo.findById(route.routeId);

    expect(fetched).not.toBeNull();
    expect(fetched?.routeId.equals(route.routeId)).toBe(true);
    expect(fetched?.distanceKm?.Value).toBe(3);
    expect(fetched?.duration?.Value).toBe(300);
    expect(
      fetched?.path?.Coordinates.map((c) => ({ lat: c.Lat, lng: c.Lng }))
    ).toEqual(route.path!.Coordinates.map((c) => ({ lat: c.Lat, lng: c.Lng })));
  });

  it("returns null when finding non-existent id", async () => {
    const missing = await repo.findById(UUID.generate());
    expect(missing).toBeNull();
  });

  it("findAll returns all saved routes", async () => {
    const routeA = Route.request({ routeId: UUID.generate() });
    routeA.generate(
      new DistanceKm(1),
      new Duration(100),
      Path.fromCoordinates([
        LatLng.fromNumbers(10, 10),
        LatLng.fromNumbers(20, 20),
      ])
    );
    const routeB = Route.request({ routeId: UUID.generate() });
    routeB.generate(
      new DistanceKm(2),
      new Duration(200),
      Path.fromCoordinates([
        LatLng.fromNumbers(30, 30),
        LatLng.fromNumbers(40, 40),
      ])
    );

    await repo.save(routeA);
    await repo.save(routeB);

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
    expect(all.map((r) => r.routeId.Value)).toEqual(
      expect.arrayContaining([routeA.routeId.Value, routeB.routeId.Value])
    );
  });

  it("findByJobId filters routes by jobId", async () => {
    const jobId = UUID.generate();
    const r1 = Route.request({ routeId: UUID.generate(), jobId });
    const r2 = Route.request({ routeId: UUID.generate(), jobId });
    await repo.save(r1);
    await repo.save(r2);

    const res = await repo.findByJobId(jobId);
    expect(res.map((r) => r.routeId.Value)).toEqual([
      r1.routeId.Value,
      r2.routeId.Value,
    ]);
  });

  it("remove deletes the route", async () => {
    const route = Route.request({ routeId: UUID.generate() });
    route.generate(
      new DistanceKm(5),
      new Duration(500),
      Path.fromCoordinates([
        LatLng.fromNumbers(50, 50),
        LatLng.fromNumbers(60, 60),
      ])
    );

    await repo.save(route);
    expect(await repo.findById(route.routeId)).not.toBeNull();

    await repo.remove(route.routeId);
    expect(await repo.findById(route.routeId)).toBeNull();
  });
});
