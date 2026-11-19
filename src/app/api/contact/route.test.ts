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

	it("only counts valid messages against the limit", async () => {
		const POST = await loadRoute();

		for (let i = 0; i < 25; i++) {
			await POST(post({ ...valid, email: "x" }, "7.7.7.7"));
			await POST(post({ ...valid, website: "http://spam" }, "7.7.7.7"));
		}

		expect((await POST(post(valid, "7.7.7.7"))).status).toBe(200);
	});
});
