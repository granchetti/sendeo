const mockPut = jest.fn();
const mockDelete = jest.fn();
const mockGet = jest.fn();
const mockPublishSaved = jest.fn();
const mockPublishDeleted = jest.fn();

jest.mock(
  "../../infrastructure/dynamodb/dynamo-user-profile-repository",
  () => ({
    DynamoUserProfileRepository: jest.fn().mockImplementation(() => ({
      putFavourite: mockPut,
      deleteFavourite: mockDelete,
      getFavourites: mockGet,
    })),
  })
);

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../../../routes/interfaces/appsync-client", () => ({
  publishFavouriteSaved: (...args: any[]) => mockPublishSaved(...args),
  publishFavouriteDeleted: (...args: any[]) => mockPublishDeleted(...args),
}));

import { handler } from "./favourite-routes";
import { Scope } from "../../../auth/scopes";

const baseCtx = {
  requestContext: {
    authorizer: {
      claims: { email: "test@example.com", "cognito:groups": [Scope.FAVOURITES] },
    },
  },
  headers: { Accept: "application/json" },
} as any;

beforeEach(() => {
  mockPut.mockReset();
  mockDelete.mockReset();
  mockGet.mockReset();
  mockPublishSaved.mockReset();
  mockPublishDeleted.mockReset();
});

describe("authorization", () => {
  it("returns 403 when group missing", async () => {
    const res = await handler({
      ...baseCtx,
      requestContext: { authorizer: { claims: { email: "test@example.com" } } },
      resource: "/v1/routes",
      httpMethod: "GET",
    } as any);
    expect(res.statusCode).toBe(403);
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
    expect(mockPublishSaved).toHaveBeenCalledWith("test@example.com", "1");
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
    expect(mockPublishDeleted).toHaveBeenCalledWith("test@example.com", "2");
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
