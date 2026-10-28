import sendFeedback from "./send-feedback";

const mockGetSession = jest.fn();
let mockConfigured = true;
jest.mock("@/persistence/repositories/supabase-client", () => ({
	get isSupabaseConfigured() {
		return mockConfigured;
	},
	supabase: { auth: { getSession: () => mockGetSession() } },
}));

const submission = { rating: 4, comment: "ok", locale: "fr" as const };

describe("sendFeedback", () => {
	const fetchMock = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		mockConfigured = true;
		global.fetch = fetchMock;
		fetchMock.mockResolvedValue({ ok: true });
		mockGetSession.mockResolvedValue({ data: { session: null } });
	});

	it("posts the opinion as JSON, without credentials for a visitor", async () => {
		expect(await sendFeedback(submission)).toBe(true);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("/api/feedback");
		expect(init.method).toBe("POST");
		expect(init.headers.Authorization).toBeUndefined();
		expect(JSON.parse(init.body)).toEqual(submission);
	});

	it("sends the access token of a signed-in user", async () => {
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: "tok" } },
		});

		await sendFeedback(submission);

		expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
	});

	it("does not look for a session when the cloud is not configured", async () => {
		mockConfigured = false;

		await sendFeedback(submission);

		expect(mockGetSession).not.toHaveBeenCalled();
	});

	it("still sends when the session lookup fails", async () => {
		mockGetSession.mockRejectedValue(new Error("boom"));

		expect(await sendFeedback(submission)).toBe(true);
	});

	it("reports failure on a refused request or a network error", async () => {
		fetchMock.mockResolvedValueOnce({ ok: false });
		expect(await sendFeedback(submission)).toBe(false);

		fetchMock.mockRejectedValueOnce(new Error("offline"));
		expect(await sendFeedback(submission)).toBe(false);
	});
});
