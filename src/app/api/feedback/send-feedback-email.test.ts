import sendFeedbackEmail, {
	isFeedbackEmailConfigured,
} from "./send-feedback-email";

const submission = { rating: 4, comment: "Très utile", locale: "fr" as const };

describe("sendFeedbackEmail", () => {
	const fetchMock = jest.fn();
	const originalEnv = process.env;

	beforeEach(() => {
		fetchMock.mockReset();
		global.fetch = fetchMock;
		process.env = {
			...originalEnv,
			RESEND_API_KEY: "key",
			FEEDBACK_EMAIL_FROM: "Studomate <avis@example.com>",
			FEEDBACK_EMAIL_TO: "me@example.com",
		};
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it("is not configured without an API key or a sender", () => {
		delete process.env.RESEND_API_KEY;
		expect(isFeedbackEmailConfigured()).toBe(false);
		process.env.RESEND_API_KEY = "key";
		delete process.env.FEEDBACK_EMAIL_FROM;
		expect(isFeedbackEmailConfigured()).toBe(false);
	});

	it("sends nothing and reports failure when not configured", async () => {
		delete process.env.RESEND_API_KEY;

		expect(await sendFeedbackEmail(submission, null)).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("posts the opinion to Resend", async () => {
		fetchMock.mockResolvedValue({ ok: true });

		expect(await sendFeedbackEmail(submission, "user-1")).toBe(true);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("https://api.resend.com/emails");
		expect(init.headers.Authorization).toBe("Bearer key");
		const body = JSON.parse(init.body);
		expect(body.from).toBe("Studomate <avis@example.com>");
		expect(body.to).toBe("me@example.com");
		expect(body.subject).toContain("4/5");
		expect(body.text).toContain("Très utile");
		expect(body.text).toContain("user-1");
	});

	it("mentions a visitor without account and a missing comment", async () => {
		fetchMock.mockResolvedValue({ ok: true });

		await sendFeedbackEmail({ ...submission, comment: null }, null);

		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.text).toContain("non connecté");
		expect(body.text).toContain("aucun commentaire");
	});

	it("falls back on the contact address when no recipient is set", async () => {
		delete process.env.FEEDBACK_EMAIL_TO;
		fetchMock.mockResolvedValue({ ok: true });

		await sendFeedbackEmail(submission, null);

		expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toBe(
			"dev.vporel@gmail.com",
		);
	});

	it("reports failure when Resend refuses or the network fails", async () => {
		fetchMock.mockResolvedValueOnce({ ok: false });
		expect(await sendFeedbackEmail(submission, null)).toBe(false);

		fetchMock.mockRejectedValueOnce(new Error("offline"));
		expect(await sendFeedbackEmail(submission, null)).toBe(false);
	});
});
