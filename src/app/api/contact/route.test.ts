export {};

const mockSendContactEmail = jest.fn();
jest.mock("./send-contact-email", () => ({
	__esModule: true,
	default: (...args: unknown[]) => mockSendContactEmail(...args),
}));

const mockEmailConfigured = jest.fn();
jest.mock("../send-email", () => ({
	__esModule: true,
	isEmailConfigured: () => mockEmailConfigured(),
}));

const valid = {
	topic: "forgotten-password",
	email: "eleve@lycee.fr",
	message: "J'ai oublié mon mot de passe. Mon pseudo : alex",
	locale: "fr",
};

function post(body: unknown, ip = "1.2.3.4") {
	return new Request("http://localhost/api/contact", {
		method: "POST",
		headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
}

async function loadRoute() {
	jest.resetModules();
	return (await import("./route")).POST;
}

describe("POST /api/contact", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockEmailConfigured.mockReturnValue(true);
		mockSendContactEmail.mockResolvedValue(true);
	});

	it("mails a valid message", async () => {
		const POST = await loadRoute();

		const response = await POST(post(valid));

		expect(response.status).toBe(200);
		expect(mockSendContactEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				topic: "forgotten-password",
				email: "eleve@lycee.fr",
			}),
		);
	});

	it("rejects an invalid payload", async () => {
		const POST = await loadRoute();

		expect((await POST(post({ ...valid, email: "x" }))).status).toBe(400);
		expect((await POST(post("not json"))).status).toBe(400);
		expect(mockSendContactEmail).not.toHaveBeenCalled();
	});

	it("answers a bot that filled the hidden field as if it worked, without mailing", async () => {
		const POST = await loadRoute();

		const response = await POST(post({ ...valid, website: "http://spam" }));

		expect(response.status).toBe(200);
		expect(mockSendContactEmail).not.toHaveBeenCalled();
	});

	it("reports that sending is not configured", async () => {
		mockEmailConfigured.mockReturnValue(false);
		const POST = await loadRoute();

		expect((await POST(post(valid))).status).toBe(503);
		expect(mockSendContactEmail).not.toHaveBeenCalled();
	});

	it("reports a failed sending", async () => {
		mockSendContactEmail.mockResolvedValue(false);
		const POST = await loadRoute();

		expect((await POST(post(valid))).status).toBe(502);
	});

	it("limits the number of messages per client", async () => {
		const POST = await loadRoute();

		for (let i = 0; i < 20; i++) {
			expect((await POST(post(valid, "9.9.9.9"))).status).toBe(200);
		}
		expect((await POST(post(valid, "9.9.9.9"))).status).toBe(429);
		expect((await POST(post(valid, "8.8.8.8"))).status).toBe(200);
	});

	it("does not let a forged forwarded prefix escape the limit", async () => {
		const POST = await loadRoute();

		for (let i = 0; i < 20; i++) {
			expect((await POST(post(valid, `5.5.5.${i}, 9.9.9.9`))).status).toBe(200);
		}

		expect((await POST(post(valid, "5.5.5.99, 9.9.9.9"))).status).toBe(429);
	});

	it("answers 413 for a body announced as too large, without sending anything", async () => {
		const POST = await loadRoute();
		const request = new Request("http://localhost/api/contact", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-forwarded-for": "1.2.3.4",
				"content-length": String(10 * 1024 * 1024),
			},
			body: JSON.stringify(valid),
		});

		const response = await POST(request);

		expect(response.status).toBe(413);
		expect(await response.json()).toEqual({ error: "too-large" });
		expect(mockSendContactEmail).not.toHaveBeenCalled();
	});

	it("answers 413 for a very large body, whatever its content-length says", async () => {
		const POST = await loadRoute();
		const huge = JSON.stringify({ ...valid, message: "x".repeat(200_000) });

		const response = await POST(post(huge));

		expect(response.status).toBe(413);
		expect(mockSendContactEmail).not.toHaveBeenCalled();
	});

	it("still answers 400 for a body that is not JSON", async () => {
		const POST = await loadRoute();

		expect((await POST(post("not json"))).status).toBe(400);
	});

	it("does not count a refused oversized body against the limit", async () => {
		const POST = await loadRoute();
		const huge = JSON.stringify({ ...valid, message: "x".repeat(200_000) });
		for (let i = 0; i < 25; i++) await POST(post(huge, "6.6.6.6"));

		expect((await POST(post(valid, "6.6.6.6"))).status).toBe(200);
	});

	it("only counts valid messages against the limit", async () => {
		const POST = await loadRoute();

		for (let i = 0; i < 25; i++) {
			await POST(post({ ...valid, email: "x" }, "7.7.7.7"));
			await POST(post({ ...valid, website: "http://spam" }, "7.7.7.7"));
		}

		expect((await POST(post(valid, "7.7.7.7"))).status).toBe(200);
	});
});
