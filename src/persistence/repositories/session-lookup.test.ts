import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";

import { supabaseMocks } from "@tests/utils/supabase-mock";

jest.mock("./supabase-client", () =>
	jest.requireActual("@tests/utils/supabase-mock").createSupabaseMock(),
);

const mockGetSession = supabaseMocks.getSession;

import lookupSession, { SESSION_LOOKUP_TIMEOUT_MS } from "./session-lookup";

describe("lookupSession", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
	});
	afterEach(() => jest.useRealTimers());

	it("returns the stored session", async () => {
		const session = { user: { id: "u1" } };
		mockGetSession.mockResolvedValue({ data: { session }, error: null });

		await expect(lookupSession()).resolves.toEqual({
			status: "signed-in",
			session,
		});
	});

	it("tells signed-out from unreachable", async () => {
		mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
		await expect(lookupSession()).resolves.toEqual({ status: "signed-out" });

		mockGetSession.mockResolvedValue({
			data: { session: null },
			error: new AuthRetryableFetchError("Failed to fetch", 0),
		});
		await expect(lookupSession()).resolves.toEqual({ status: "unreachable" });
	});

	it("is signed out when the server refuses the refresh token", async () => {
		mockGetSession.mockResolvedValue({
			data: { session: null },
			error: new AuthApiError(
				"Invalid Refresh Token",
				400,
				"refresh_token_not_found",
			),
		});

		await expect(lookupSession()).resolves.toEqual({ status: "signed-out" });
	});

	it("is unreachable when getSession rejects", async () => {
		mockGetSession.mockRejectedValue(new Error("Failed to fetch"));

		await expect(lookupSession()).resolves.toEqual({ status: "unreachable" });
	});

	it("is unreachable when getSession throws synchronously", async () => {
		mockGetSession.mockImplementation(() => {
			throw new Error("boom");
		});

		await expect(lookupSession()).resolves.toEqual({ status: "unreachable" });
	});

	it("gives up after the timeout when getSession never answers", async () => {
		mockGetSession.mockReturnValue(new Promise(() => {}));

		const lookup = lookupSession();
		await jest.advanceTimersByTimeAsync(SESSION_LOOKUP_TIMEOUT_MS);

		await expect(lookup).resolves.toEqual({ status: "unreachable" });
	});
});
