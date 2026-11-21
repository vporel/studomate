/** @jest-environment jsdom */
import { setPreferredLocale } from "@/persistence/preferences.storage";
import createEmbeddedProjectStoreEnvironment from "./embedded-project-store-environment";

jest.mock("react-toastify", () => ({
	toast: { success: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
const { toast } = jest.requireMock("react-toastify");

const DRAFT_CORRUPTED = {
	fr: "Le brouillon est corrompu et n'a pas pu être ouvert.",
	en: "The draft is corrupted and could not be opened.",
} as const;

describe("environment of an embedded block", () => {
	beforeEach(() => jest.clearAllMocks());

	it.each(["fr", "en"] as const)(
		"translates in the language of the block (%s)",
		(locale) => {
			const env = createEmbeddedProjectStoreEnvironment({ locale });

			expect(env.translate("toasts")("draftCorrupted")).toBe(
				DRAFT_CORRUPTED[locale],
			);
		},
	);

	it("does not follow the language the browser remembers", () => {
		setPreferredLocale("es");
		const env = createEmbeddedProjectStoreEnvironment({ locale: "en" });

		expect(env.translate("toasts")("draftCorrupted")).toBe(DRAFT_CORRUPTED.en);
	});

	it("shows no error toast", () => {
		createEmbeddedProjectStoreEnvironment({ locale: "fr" }).notifications.error(
			"Oups",
		);

		expect(toast.error).not.toHaveBeenCalled();
	});

	it("has no persistence, so no draft", () => {
		expect(
			createEmbeddedProjectStoreEnvironment({ locale: "fr" }).persistence,
		).toBeUndefined();
	});
});
