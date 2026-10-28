const mockInsert = jest.fn();
const mockGetUser = jest.fn();
const mockCreateClient = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
	createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

const mockSendEmail = jest.fn();
const mockEmailConfigured = jest.fn();
jest.mock("./send-feedback-email", () => ({
	__esModule: true,
	default: (...args: unknown[]) => mockSendEmail(...args),
	isFeedbackEmailConfigured: () => mockEmailConfigured(),
}));

function post(body: unknown, headers: Record<string, string> = {}) {
	return new Request("http://localhost/api/feedback", {
		method: "POST",
		headers: { "Content-Type": "application/json", ...headers },
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
}

async function loadRoute(env: { supabase: boolean }) {
	jest.resetModules();
	if (env.supabase) {
		process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
	} else {
		delete process.env.NEXT_PUBLIC_SUPABASE_URL;
		delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	}
	return (await import("./route")).POST;
}

describe("POST /api/feedback", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockInsert.mockResolvedValue({ error: null });
		mockGetUser.mockResolvedValue({ data: { user: null } });
		mockCreateClient.mockImplementation(() => ({
			auth: { getUser: mockGetUser },
			from: () => ({ insert: mockInsert }),
		}));
		mockEmailConfigured.mockReturnValue(true);
		mockSendEmail.mockResolvedValue(true);
	});

	it("rejects an invalid payload", async () => {
		const POST = await loadRoute({ supabase: true });

		expect((await POST(post({ rating: 9 }))).status).toBe(400);
		expect((await POST(post("not json"))).status).toBe(400);
		expect(mockInsert).not.toHaveBeenCalled();
	});

	it("stores the opinion of a visitor without account and mails it", async () => {
		const POST = await loadRoute({ supabase: true });

		const response = await POST(
			post({ rating: 5, comment: " bravo ", locale: "fr" }),
		);

		expect(response.status).toBe(200);
		expect(mockInsert).toHaveBeenCalledWith({
			user_id: null,
			rating: 5,
			comment: "bravo",
			locale: "fr",
		});
		expect(mockSendEmail).toHaveBeenCalledWith(
			{ rating: 5, comment: "bravo", locale: "fr" },
			null,
		);
	});

	it("writes with the session of a signed-in user and records their id", async () => {
		mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
		const POST = await loadRoute({ supabase: true });

		const response = await POST(
			post({ rating: 3 }, { Authorization: "Bearer token-1" }),
		);

		expect(response.status).toBe(200);
		expect(mockGetUser).toHaveBeenCalledWith("token-1");
		expect(mockCreateClient).toHaveBeenLastCalledWith(
			"https://x.supabase.co",
			"anon",
			expect.objectContaining({
				global: { headers: { Authorization: "Bearer token-1" } },
			}),
		);
		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({ user_id: "user-1" }),
		);
	});

	it("treats an invalid token as a visitor without account", async () => {
		mockGetUser.mockResolvedValue({ data: { user: null } });
		const POST = await loadRoute({ supabase: true });

		await POST(post({ rating: 3 }, { Authorization: "Bearer stale" }));

		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({ user_id: null }),
		);
	});

	it("succeeds when only the mail went through", async () => {
		mockInsert.mockResolvedValue({ error: { message: "boom" } });
		const POST = await loadRoute({ supabase: true });

		expect((await POST(post({ rating: 4 }))).status).toBe(200);
	});

	it("succeeds when only the database insert went through", async () => {
		mockSendEmail.mockResolvedValue(false);
		const POST = await loadRoute({ supabase: true });

		expect((await POST(post({ rating: 4 }))).status).toBe(200);
	});

	it("fails when neither channel kept the opinion", async () => {
		mockInsert.mockResolvedValue({ error: { message: "boom" } });
		mockSendEmail.mockResolvedValue(false);
		const POST = await loadRoute({ supabase: true });

		expect((await POST(post({ rating: 4 }))).status).toBe(502);
	});

	it("answers 503 when neither Supabase nor the mail is configured", async () => {
		mockEmailConfigured.mockReturnValue(false);
		const POST = await loadRoute({ supabase: false });

		expect((await POST(post({ rating: 4 }))).status).toBe(503);
	});

	it("still mails the opinion when Supabase is not configured", async () => {
		const POST = await loadRoute({ supabase: false });

		expect((await POST(post({ rating: 4 }))).status).toBe(200);
		expect(mockInsert).not.toHaveBeenCalled();
	});

	it("answers 429 once a client sends too many requests", async () => {
		const POST = await loadRoute({ supabase: true });
		const headers = { "x-forwarded-for": "1.2.3.4, 10.0.0.1" };

		for (let i = 0; i < 5; i++) await POST(post({ rating: 4 }, headers));

		expect((await POST(post({ rating: 4 }, headers))).status).toBe(429);
	});
});
