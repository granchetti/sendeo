const mockGetProfile = jest.fn();
const mockPutProfile = jest.fn();

jest.mock("../../infrastructure/dynamodb/dynamo-user-state-repository", () => ({
  DynamoUserStateRepository: jest.fn().mockImplementation(() => ({
    getProfile: mockGetProfile,
    putProfile: mockPutProfile,
  })),
}));

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

import { handler } from "./profile-routes";
import { UserProfile } from "../../domain/entities/user-profile";
import { Email } from "../../../routes/domain/value-objects/email-value-object";

const baseCtx = {
  requestContext: { authorizer: { claims: { email: "test@example.com" } } },
} as any;

beforeEach(() => {
  mockGetProfile.mockReset();
  mockPutProfile.mockReset();
});

describe("profile routes handler", () => {
  it("returns profile on GET", async () => {
    const profile = UserProfile.fromPrimitives({ email: "test@example.com", firstName: "t" });
    mockGetProfile.mockResolvedValueOnce(profile);
    const res = await handler({ ...baseCtx, httpMethod: "GET" } as any);
    expect(mockGetProfile).toHaveBeenCalledWith(expect.any(Email));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(profile.toPrimitives());
  });

  it("creates profile when missing", async () => {
    mockGetProfile.mockResolvedValueOnce(null);
    const res = await handler({ ...baseCtx, httpMethod: "GET" } as any);
    expect(mockPutProfile).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ email: "test@example.com" });
  });

  it("updates profile on PUT", async () => {
    const body = { firstName: "A", lastName: "B" };
    const res = await handler({
      ...baseCtx,
      httpMethod: "PUT",
      body: JSON.stringify(body),
    } as any);
    expect(mockPutProfile).toHaveBeenCalledWith(expect.any(UserProfile));
    expect(res.statusCode).toBe(200);
  });

  it("returns 400 when PUT body invalid", async () => {
    const res = await handler({ ...baseCtx, httpMethod: "PUT", body: "{" } as any);
    expect(res.statusCode).toBe(400);
  });
});
