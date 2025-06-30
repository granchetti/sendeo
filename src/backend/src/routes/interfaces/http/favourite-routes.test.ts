const mockPut = jest.fn();
const mockDelete = jest.fn();
const mockGet = jest.fn();

jest.mock(
  "../../infrastructure/dynamodb/dynamo-user-state-repository",
  () => ({
    DynamoUserStateRepository: jest.fn().mockImplementation(() => ({
      putFavourite: mockPut,
      deleteFavourite: mockDelete,
      getFavourites: mockGet,
    })),
  })
);

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

import { handler } from "./favourite-routes";

const baseCtx = {
  requestContext: { authorizer: { claims: { email: "test@example.com" } } },
} as any;

beforeEach(() => {
  mockPut.mockReset();
  mockDelete.mockReset();
  mockGet.mockReset();
});

describe("favourite routes handler", () => {
  it("saves favourite on POST", async () => {
    mockGet.mockResolvedValueOnce([]);  // ningún favorito previo
    const res = await handler({
      ...baseCtx,
      httpMethod: "POST",
      body: JSON.stringify({ routeId: "1" }),
    });
    expect(mockGet).toHaveBeenCalledWith("test@example.com");
    expect(mockPut).toHaveBeenCalledWith("test@example.com", "1");
    expect(res.statusCode).toBe(200);
  });

  it("returns 409 when favourite already exists", async () => {
    mockGet.mockResolvedValueOnce(["1"]);  // ya existe
    const res = await handler({
      ...baseCtx,
      httpMethod: "POST",
      body: JSON.stringify({ routeId: "1" }),
    });
    expect(mockGet).toHaveBeenCalledWith("test@example.com");
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
    expect(mockDelete).toHaveBeenCalledWith("test@example.com", "2");
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
