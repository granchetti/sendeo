const mockPut = jest.fn();
const mockDelete = jest.fn();
const mockGet = jest.fn();
const mockPublishSaved = jest.fn();
const mockPublishDeleted = jest.fn();

const mockVerifyJwt = jest.fn();

jest.mock("../../../routes/interfaces/appsync-client", () => ({
  publishFavouriteSaved: (...args: any[]) => mockPublishSaved(...args),
  publishFavouriteDeleted: (...args: any[]) => mockPublishDeleted(...args),
}));

jest.mock("../../../shared/auth/verify-jwt", () => ({
  verifyJwt: (...args: any[]) => mockVerifyJwt(...args),
}));

import { createFavouriteRoutesHandler } from "./favourite-routes";
import type { UserProfileRepository } from "../../domain/repositories/user-profile-repository";

const repository: UserProfileRepository = {
  putFavourite: mockPut,
  deleteFavourite: mockDelete,
  getFavourites: mockGet,
  getProfile: jest.fn(),
  putProfile: jest.fn(),
  deleteProfile: jest.fn(),
};

const handler = createFavouriteRoutesHandler(repository);
const baseCtx = {
  requestContext: {},
  headers: { Accept: "application/json", Authorization: "Bearer token" },
} as any;

beforeEach(() => {
  mockPut.mockReset();
  mockDelete.mockReset();
  mockGet.mockReset();
  mockPublishSaved.mockReset();
  mockPublishDeleted.mockReset();
  mockVerifyJwt.mockReset();
  mockVerifyJwt.mockResolvedValue({ email: "test@example.com" });
});

describe("authorization", () => {
  const event = { ...baseCtx, httpMethod: "GET" } as any;

  it("returns 401 when Authorization header missing", async () => {
    const res = await handler({ ...event, headers: { Accept: "application/json" } });
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 when token verification fails", async () => {
    mockVerifyJwt.mockRejectedValueOnce(new Error("tampered"));
    const res = await handler(event);
    expect(res.statusCode).toBe(401);
  });
});

describe("favourite routes handler", () => {
  it("returns list of favourites on GET", async () => {
    mockGet.mockResolvedValueOnce(["FAV#1", "FAV#2"]);
    const res = await handler({
      ...baseCtx,
      httpMethod: "GET",
    });
    expect(mockGet.mock.calls[0][0].Value).toBe("test@example.com");
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ favourites: ["1", "2"] });
  });

  it("saves favourite on POST", async () => {
    mockGet.mockResolvedValueOnce([]); // ningún favorito previo
    const res = await handler({
      ...baseCtx,
      httpMethod: "POST",
      body: JSON.stringify({ routeId: "1" }),
    });
    expect(mockGet.mock.calls[0][0].Value).toBe("test@example.com");
    expect(mockPut.mock.calls[0][0].Value).toBe("test@example.com");
    expect(mockPut.mock.calls[0][1]).toBe("1");
    expect(mockPublishSaved).toHaveBeenCalledWith("test@example.com", "1", 1);
    expect(res.statusCode).toBe(200);
  });

  it("returns 409 when favourite already exists", async () => {
    mockGet.mockResolvedValueOnce(["1"]); // ya existe
    const res = await handler({
      ...baseCtx,
      httpMethod: "POST",
      body: JSON.stringify({ routeId: "1" }),
    });
    expect(mockGet.mock.calls[0][0].Value).toBe("test@example.com");
    expect(mockPut).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
  });

  it("returns 400 on invalid body", async () => {
    const res = await handler({
      ...baseCtx,
      httpMethod: "POST",
      body: "{",
    });
    expect(res.statusCode).toBe(400);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("returns 400 when routeId missing", async () => {
    const res = await handler({
      ...baseCtx,
      httpMethod: "POST",
      body: "{}",
    });
    expect(res.statusCode).toBe(400);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("deletes favourite on DELETE", async () => {
    const res = await handler({
      ...baseCtx,
      httpMethod: "DELETE",
      pathParameters: { routeId: "2" },
    });
    expect(mockDelete.mock.calls[0][0].Value).toBe("test@example.com");
    expect(mockDelete.mock.calls[0][1]).toBe("2");
    expect(mockPublishDeleted).toHaveBeenCalledWith("test@example.com", "2", 1);
    expect(res.statusCode).toBe(200);
  });

  it("returns 400 when routeId param missing on DELETE", async () => {
    const res = await handler({
      ...baseCtx,
      httpMethod: "DELETE",
    });
    expect(res.statusCode).toBe(400);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
