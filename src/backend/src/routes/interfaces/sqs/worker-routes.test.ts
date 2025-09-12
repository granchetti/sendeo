import { createWorkerRoutesHandler } from "./worker-routes";
import type { RouteRepository } from "../../domain/repositories/route-repository";
import type { RouteProvider } from "../../domain/services/route-provider";
import type { QueuePublisher } from "../../domain/queues/queue-publisher";
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
  geocode: async () => ({ lat: 0, lng: 0 }),
  computeRoutes: async () => [
    { distanceMeters: 1000, durationSeconds: 600, encoded: "abc" },
  ],
  snapToRoad: async (pt) => pt,
  getCityName: async () => "city",
};

const queue: QueuePublisher = { send: jest.fn() };

const handler = createWorkerRoutesHandler(repository, provider, queue);

beforeEach(() => {
  save.mockReset();
  publish.mockReset();
  publishError.mockReset();
  (queue.send as jest.Mock).mockReset();
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

