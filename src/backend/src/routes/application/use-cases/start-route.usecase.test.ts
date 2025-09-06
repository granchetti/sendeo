import { StartRouteUseCase } from "./start-route";
import { RouteRepository } from "../../domain/repositories/route-repository";
import { Route } from "../../domain/entities/route-entity";
import { UUID } from "../../../shared/domain/value-objects/uuid-value-object";
import {
  EventDispatcher,
  InMemoryEventDispatcher,
} from "../../../shared/domain/events/event-dispatcher";
import { RouteStartedEvent } from "../../domain/events/route-started";
import { DistanceKm } from "../../domain/value-objects/distance-value-object";
import { Duration } from "../../domain/value-objects/duration-value-object";
import { Path } from "../../domain/value-objects/path-value-object";
import { LatLng } from "../../domain/value-objects/lat-lng-value-object";
import { RouteStatus } from "../../domain/value-objects/route-status";

describe("StartRouteUseCase", () => {
  it("starts route, saves and publishes event", async () => {
    const route = Route.request({ routeId: UUID.generate() });
    route.generate(
      new DistanceKm(1),
      new Duration(60),
      Path.fromCoordinates([
        LatLng.fromNumbers(0, 0),
        LatLng.fromNumbers(1, 1),
      ])
    );
    const findById = jest.fn().mockResolvedValue(route);
    const save = jest.fn();
    const repo: RouteRepository = { findById, save } as any;
    const dispatcher: EventDispatcher = new InMemoryEventDispatcher();
    const handler = jest.fn();
    dispatcher.subscribe("RouteStarted", handler);
    const useCase = new StartRouteUseCase(repo, dispatcher);
    const ts = Date.now();

    const result = await useCase.execute({
      routeId: route.routeId,
      email: "a@test",
      timestamp: ts,
    });

    expect(findById).toHaveBeenCalledWith(route.routeId);
    expect(save).toHaveBeenCalledWith(route);
    expect(result?.status).toBe(RouteStatus.Started);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toBeInstanceOf(RouteStartedEvent);
  });

  it("returns null when route not found", async () => {
    const findById = jest.fn().mockResolvedValue(null);
    const repo: RouteRepository = { findById } as any;
    const dispatcher: EventDispatcher = new InMemoryEventDispatcher();
    const useCase = new StartRouteUseCase(repo, dispatcher);
    const res = await useCase.execute({
      routeId: UUID.generate(),
      email: "b@test",
      timestamp: Date.now(),
    });
    expect(res).toBeNull();
  });
});
