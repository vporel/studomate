import { APP_CONTACT_EMAIL, APP_FEEDBACK_EMAIL_FROM } from "@/app-info";
import sendEmailToTeam, { isEmailConfigured } from "./send-email";

describe("sendEmailToTeam", () => {
	const fetchMock = jest.fn();
	const originalEnv = process.env;

	beforeEach(() => {
		fetchMock.mockReset();
		global.fetch = fetchMock;
		process.env = { ...originalEnv, RESEND_API_KEY: "key" };
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it("is configured by the API key", () => {
		expect(isEmailConfigured()).toBe(true);
		delete process.env.RESEND_API_KEY;
		expect(isEmailConfigured()).toBe(false);
	});

	it("posts the email to Resend, with the reply address when given", async () => {
		fetchMock.mockResolvedValue({ ok: true });

		expect(
			await sendEmailToTeam({
				subject: "Sujet",
				text: "Texte",
				replyTo: "a@b.fr",
			}),
		).toBe(true);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("https://api.resend.com/emails");
		const body = JSON.parse(init.body);
		expect(body).toEqual({
			from: APP_FEEDBACK_EMAIL_FROM,
			to: APP_CONTACT_EMAIL,
			subject: "Sujet",
			text: "Texte",
			reply_to: "a@b.fr",
		});
	});

	it("sends no reply address when none is given", async () => {
		fetchMock.mockResolvedValue({ ok: true });

		await sendEmailToTeam({ subject: "Sujet", text: "Texte" });

		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty(
			"reply_to",
		);
	});

	it("sends nothing when not configured, and reports a network failure", async () => {
		delete process.env.RESEND_API_KEY;
		expect(await sendEmailToTeam({ subject: "S", text: "T" })).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();

		process.env.RESEND_API_KEY = "key";
		fetchMock.mockRejectedValue(new Error("network"));
		expect(await sendEmailToTeam({ subject: "S", text: "T" })).toBe(false);
	});
});
