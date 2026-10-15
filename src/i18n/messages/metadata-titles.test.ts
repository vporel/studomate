import { TITLE_TEMPLATE } from "@/app/metadata";
import en from "./en/public.json";
import fr from "./fr/public.json";

const MAX_TITLE_LENGTH = 60;

type Metadata = Record<string, unknown>;

function collectTitles(metadata: Metadata, prefix = ""): [string, string][] {
	return Object.entries(metadata).flatMap(([key, value]) => {
		const path = prefix + key;
		if (typeof value === "string")
			return key === "title" || /Title$/.test(key)
				? [[path, value] as [string, string]]
				: [];
		return collectTitles(value as Metadata, `${path}.`);
	});
}

describe.each([
	["fr", fr.metadata],
	["en", en.metadata],
])("titres de pages (%s)", (_locale, metadata) => {
	const titles = collectTitles(metadata as Metadata).filter(
		([path]) => !path.includes("trainingStepFallbackTitle"),
	);

	it.each(titles)("%s tient dans la limite de longueur une fois suffixé", (path, title) => {
		const hasOwnSuffix =
			path === "homeTitle" ||
			path.startsWith("manualSections.") ||
			path.startsWith("trainingSteps.");
		const full = hasOwnSuffix ? title : TITLE_TEMPLATE.replace("%s", title);
		expect(full.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
	});

	it("les titres soumis au template ne répètent pas le suffixe", () => {
		const templated = titles.filter(
			([path]) =>
				path !== "homeTitle" &&
				!path.startsWith("manualSections.") &&
				!path.startsWith("trainingSteps."),
		);
		for (const [, title] of templated) expect(title).not.toMatch(/Studomate/);
	});
});
