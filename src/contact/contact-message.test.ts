import {
	CONTACT_MESSAGE_MAX_LENGTH,
	CONTACT_NAME_MAX_LENGTH,
	hasContactTemplate,
	isContactTopic,
	isValidContactEmail,
	parseContactSubmission,
} from "./contact-message";

const valid = {
	topic: "question",
	email: "eleve@lycee.fr",
	name: "Alex",
	message: "Comment ajouter une étape initiale ?",
	locale: "fr",
};

describe("isContactTopic", () => {
	it("accepts the known topics only", () => {
		expect(isContactTopic("forgotten-password")).toBe(true);
		expect(isContactTopic("problem")).toBe(true);
		expect(isContactTopic("spam")).toBe(false);
		expect(isContactTopic(null)).toBe(false);
	});
});

describe("hasContactTemplate", () => {
	it("is true for the topics whose message starts from a template", () => {
		expect(hasContactTemplate("forgotten-password")).toBe(true);
		expect(hasContactTemplate("problem")).toBe(true);
		expect(hasContactTemplate("question")).toBe(false);
	});
});

describe("isValidContactEmail", () => {
	it("accepts an address and refuses what is not one", () => {
		expect(isValidContactEmail("a@b.fr")).toBe(true);
		expect(isValidContactEmail("a@b")).toBe(false);
		expect(isValidContactEmail("a b@c.fr")).toBe(false);
		expect(isValidContactEmail(`${"a".repeat(250)}@b.fr`)).toBe(false);
	});
});

describe("parseContactSubmission", () => {
	it("keeps a valid message, trimmed", () => {
		expect(
			parseContactSubmission({
				...valid,
				email: " eleve@lycee.fr ",
				message: "  Comment ajouter une étape initiale ?  ",
			}),
		).toEqual({
			topic: "question",
			email: "eleve@lycee.fr",
			name: "Alex",
			message: "Comment ajouter une étape initiale ?",
			locale: "fr",
			userAgent: null,
		});
	});

	it("treats a blank name as no name and an unknown locale as none", () => {
		expect(
			parseContactSubmission({ ...valid, name: "  ", locale: "de" }),
		).toMatchObject({ name: null, locale: null });
	});

	it("keeps the browser only for a problem report", () => {
		expect(
			parseContactSubmission({ ...valid, userAgent: "Firefox" })?.userAgent,
		).toBeNull();
		expect(
			parseContactSubmission({
				...valid,
				topic: "problem",
				userAgent: "Firefox",
			})?.userAgent,
		).toBe("Firefox");
	});

	it.each<[string, Record<string, unknown>]>([
		["an unknown topic", { topic: "spam" }],
		["an invalid email", { email: "pas-un-email" }],
		["a message too short", { message: "Bonjour" }],
		[
			"a message too long",
			{ message: "a".repeat(CONTACT_MESSAGE_MAX_LENGTH + 1) },
		],
		["a name too long", { name: "a".repeat(CONTACT_NAME_MAX_LENGTH + 1) }],
		["a name that is not text", { name: 3 }],
	])("refuses %s", (_, patch) => {
		expect(parseContactSubmission({ ...valid, ...patch })).toBeNull();
	});

	it("refuses what is not an object", () => {
		expect(parseContactSubmission(null)).toBeNull();
		expect(parseContactSubmission("message")).toBeNull();
	});
});
