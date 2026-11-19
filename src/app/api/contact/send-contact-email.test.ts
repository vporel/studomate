const mockSendEmailToTeam = jest.fn();
jest.mock("../send-email", () => ({
	__esModule: true,
	default: (...args: unknown[]) => mockSendEmailToTeam(...args),
}));

import sendContactEmail from "./send-contact-email";

const submission = {
	topic: "problem" as const,
	email: "prof@lycee.fr",
	name: null,
	message: "La simulation ne démarre pas.",
	locale: "fr" as const,
	userAgent: "Firefox 140",
};

describe("sendContactEmail", () => {
	beforeEach(() => {
		mockSendEmailToTeam.mockReset();
		mockSendEmailToTeam.mockResolvedValue(true);
	});

	it("names the topic in the subject and answers to the visitor", async () => {
		expect(await sendContactEmail(submission)).toBe(true);

		const email = mockSendEmailToTeam.mock.calls[0][0];
		expect(email.subject).toBe("[Studomate] Contact : Problème");
		expect(email.replyTo).toBe("prof@lycee.fr");
		expect(email.text).toContain("La simulation ne démarre pas.");
		expect(email.text).toContain("Nom : (non renseigné)");
		expect(email.text).toContain("Navigateur : Firefox 140");
	});

	it("leaves the browser out when it was not sent", async () => {
		await sendContactEmail({
			...submission,
			topic: "question",
			userAgent: null,
		});

		expect(mockSendEmailToTeam.mock.calls[0][0].text).not.toContain(
			"Navigateur",
		);
	});

	it("reports the failure of the sending", async () => {
		mockSendEmailToTeam.mockResolvedValue(false);

		expect(await sendContactEmail(submission)).toBe(false);
	});
});
