const mockGetProfile = jest.fn();
const mockPutProfile = jest.fn();
const mockDeleteProfile = jest.fn();

import { createProfileRoutesHandler } from "./profile-routes";
import { UserProfileRepository } from "../../domain/repositories/user-profile-repository";

let repository: UserProfileRepository;
let handler: any;
import { UserProfile } from "../../domain/entities/user-profile";
import { Email } from "../../../shared/domain/value-objects/email";
const baseCtx = {
  requestContext: { authorizer: { claims: { email: "test@example.com" } } },
  headers: { Accept: "application/json" },
} as any;

beforeEach(() => {
  mockGetProfile.mockReset();
  mockPutProfile.mockReset();
  mockDeleteProfile.mockReset();
  repository = {
    getProfile: mockGetProfile,
    putProfile: mockPutProfile,
    deleteProfile: mockDeleteProfile,
    putFavourite: jest.fn(),
    deleteFavourite: jest.fn(),
    getFavourites: jest.fn(),
  };
  handler = createProfileRoutesHandler(repository);
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

  it("supports mixed Accept headers", async () => {
    const profile = UserProfile.fromPrimitives({ email: "test@example.com" });
    mockGetProfile.mockResolvedValueOnce(profile);
    const res = await handler({
      ...baseCtx,
      headers: { Accept: "text/plain, application/json" },
      httpMethod: "GET",
    } as any);
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

  it("deletes profile on DELETE", async () => {
    const res = await handler({ ...baseCtx, httpMethod: "DELETE" } as any);
    expect(mockDeleteProfile).toHaveBeenCalledWith(expect.any(Email));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ deleted: true });
  });
});
