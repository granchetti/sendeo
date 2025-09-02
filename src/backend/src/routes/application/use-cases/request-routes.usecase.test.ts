import { RequestRoutesUseCase } from "./request-routes";
import { RouteRepository } from "../../domain/repositories/route-repository";
import { Route } from "../../domain/entities/route-entity";
import { RouteStatus } from "../../domain/value-objects/route-status";
import { UUID } from "../../domain/value-objects/uuid-value-object";
import { InMemoryEventDispatcher } from "../../../shared/domain/events/event-dispatcher";
import { RouteRequestedEvent } from "../../domain/events/route-requested";

describe("RequestRoutesUseCase", () => {
  it("saves, returns a Route instance and publishes events", async () => {
    const save = jest.fn();
    const repo: RouteRepository = { save } as any;
    const dispatcher = new InMemoryEventDispatcher();
    const handler = jest.fn();
    dispatcher.subscribe("RouteRequested", handler);
    const useCase = new RequestRoutesUseCase(repo, dispatcher);
    const routeId = UUID.generate();

    const result = await useCase.execute({ routeId });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(expect.any(Route));
    expect(result.routeId.equals(routeId)).toBe(true);
    expect(result.status).toBe(RouteStatus.Requested);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toBeInstanceOf(RouteRequestedEvent);
  });
});
