import { createWorkerRoutesHandler } from "./worker-routes";
import type { RouteRepository } from "../../domain/repositories/route-repository";
import type { RouteProvider } from "../../domain/services/route-provider";
import type { QueuePublisher } from "../../domain/queues/queue-publisher";
import { RouteGenerator } from "../../domain/services/route-generator";
import { UUID } from "../../../shared/domain/value-objects/uuid";

const save = jest.fn();
const publish = jest.fn();
const publishError = jest.fn();

jest.mock("../appsync-client", () => ({
  publishRoutesGenerated: (...args: any[]) => publish(...args),
  publishErrorOccurred: (...args: any[]) => publishError(...args),
}));

const repository: RouteRepository = {
  save: save as any,
  findById: jest.fn(),
  findAll: jest.fn(),
  findByJobId: jest.fn(),
  remove: jest.fn(),
};

const provider: RouteProvider = {
  geocode: jest.fn(async () => ({ lat: 0, lng: 0 })),
  computeRoutes: jest.fn(async () => [
    { distanceMeters: 1000, durationSeconds: 600, encoded: "abc" },
  ]),
  snapToRoad: jest.fn(async (pt) => pt),
  getCityName: jest.fn(async () => "city"),
};

const queue: QueuePublisher = { send: jest.fn() };

const handler = createWorkerRoutesHandler(repository, provider, queue);

beforeEach(() => {
  save.mockReset();
  publish.mockReset();
  publishError.mockReset();
  (queue.send as jest.Mock).mockReset();
  (provider.geocode as jest.Mock).mockReset().mockResolvedValue({ lat: 0, lng: 0 });
  (provider.computeRoutes as jest.Mock)
    .mockReset()
    .mockResolvedValue([
      { distanceMeters: 1000, durationSeconds: 600, encoded: "abc" },
    ]);
  (provider.snapToRoad as jest.Mock).mockReset().mockImplementation(async (pt) => pt);
  (provider.getCityName as jest.Mock).mockReset().mockResolvedValue("city");
});

it("saves routes and publishes metrics", async () => {
  const event = {
    Records: [
      {
        body: JSON.stringify({
          version: 1,
          jobId: UUID.generate().Value,
          origin: "a",
          destination: "b",
          routesCount: 1,
        }),
      },
    ],
  } as any;

  await handler(event);

  expect(save).toHaveBeenCalled();
  expect(publish).toHaveBeenCalled();
  expect(queue.send).toHaveBeenCalled();
});

it("publishes error for malformed payload", async () => {
  const event = { Records: [{ body: "not-json" }] } as any;

  await handler(event);

  expect(publishError).toHaveBeenCalled();
  expect(publish).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
  expect(queue.send).not.toHaveBeenCalled();
});

it("publishes error when route generation fails", async () => {
  (provider.computeRoutes as jest.Mock).mockImplementation(() => {
    throw new Error("boom");
  });

  const event = {
    Records: [
      {
        body: JSON.stringify({
          version: 1,
          jobId: UUID.generate().Value,
          origin: "a",
          destination: "b",
          routesCount: 1,
        }),
      },
    ],
  } as any;

  await handler(event);

  expect(publishError).toHaveBeenCalled();
  expect(publish).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
  expect(queue.send).not.toHaveBeenCalled();
});

it("handles circular round-trip routes", async () => {
  const circ = jest
    .spyOn(RouteGenerator.prototype, "computeCircularRoute")
    .mockResolvedValue({
      distanceMeters: 1000,
      durationSeconds: 600,
      encoded: "abc",
    });

  const event = {
    Records: [
      {
        body: JSON.stringify({
          version: 1,
          jobId: UUID.generate().Value,
          origin: "a",
          distanceKm: 1,
          roundTrip: true,
          circle: true,
          routesCount: 1,
        }),
      },
    ],
  } as any;

  await handler(event);

  expect(circ).toHaveBeenCalled();
  expect(save).toHaveBeenCalled();
  expect(publish).toHaveBeenCalled();
  expect(queue.send).toHaveBeenCalled();
  expect(publishError).not.toHaveBeenCalled();

  circ.mockRestore();
});

