import { notFound as en } from "@/i18n/messages/en/public.json";
import { notFound as fr } from "@/i18n/messages/fr/public.json";
import { metadata } from "./global-not-found";

jest.mock("@/app/RootDocument", () => ({ __esModule: true, default: () => null }));
jest.mock("@/app/not-found", () => ({ __esModule: true, default: () => null }));

describe("global not-found metadata", () => {
	it("titles the page in both languages with the site suffix", () => {
		expect(metadata.title).toBe(`${fr.title} / ${en.title} — Studomate`);
	});
});
