import { APP_SHORT_DESCRIPTION } from "@/app-info";
import en from "./en/public.json";
import fr from "./fr/public.json";

type Metadata = Record<string, unknown>;

function collectDescriptions(
	metadata: Metadata,
	prefix = "",
): [string, string][] {
	return Object.entries(metadata).flatMap(([key, value]) => {
		const path = prefix + key;
		if (typeof value === "string")
			return key === "description" || /Description$/.test(key)
				? [[path, value] as [string, string]]
				: [];
		return collectDescriptions(value as Metadata, `${path}.`);
	});
}

describe.each([
	["fr", fr.metadata],
	["en", en.metadata],
])("descriptions de pages (%s)", (_locale, metadata) => {
	const descriptions = collectDescriptions(metadata as Metadata);

	it("en trouve au moins une", () => {
		expect(descriptions.length).toBeGreaterThan(0);
	});

	it.each(descriptions)("%s ne contient pas de tiret cadratin", (_path, text) => {
		expect(text).not.toContain("—");
	});
});

describe.each([
	["fr", fr.metadata.trainingSteps],
	["en", en.metadata.trainingSteps],
])("descriptions des étapes de formation (%s)", (_locale, trainingSteps) => {
	const MIN_STEP_DESCRIPTION_LENGTH = 80;
	const stepDescriptions = Object.entries(trainingSteps).flatMap(
		([moduleId, steps]) =>
			Object.entries(steps as Record<string, { description: string }>).map(
				([stepId, { description }]) =>
					[`${moduleId}.${stepId}`, description] as [string, string],
			),
	);

	it.each(stepDescriptions)("%s a une description assez développée", (_path, text) => {
		expect(text.length).toBeGreaterThanOrEqual(MIN_STEP_DESCRIPTION_LENGTH);
	});
});

it("la description courte de l'application ne contient pas de tiret cadratin", () => {
	expect(APP_SHORT_DESCRIPTION).not.toContain("—");
});
