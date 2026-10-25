import { LOCALES } from "@/i18n/config";
import TRAINING_MODULE_STEP_IDS from "./module-step-ids";
import { trainingStepIdFromSlug, trainingStepSlug } from "./step-slugs";

describe.each(TRAINING_MODULE_STEP_IDS)(
	"slugs du module $moduleId",
	({ moduleId, stepIds }) => {
		it("donne un slug français ASCII en kebab-case à chaque étape", () => {
			for (const id of stepIds) {
				expect(trainingStepSlug("fr", moduleId, id)).toMatch(
					/^[a-z0-9]+(-[a-z0-9]+)*$/,
				);
			}
		});

		it.each(LOCALES)("a des slugs uniques (%s)", (locale) => {
			const slugs = stepIds.map((id) => trainingStepSlug(locale, moduleId, id));
			expect(new Set(slugs).size).toBe(slugs.length);
		});

		it.each(LOCALES)("retrouve chaque étape depuis son slug (%s)", (locale) => {
			for (const id of stepIds) {
				const slug = trainingStepSlug(locale, moduleId, id);
				expect(trainingStepIdFromSlug(locale, moduleId, slug, stepIds)).toBe(
					id,
				);
			}
		});

		it("traduit réellement les slugs français, sauf les ids déjà identiques", () => {
			const untranslated = stepIds.filter(
				(id) => trainingStepSlug("fr", moduleId, id) === id,
			);
			expect(
				untranslated.every((id) => ["automatisme", "conclusion"].includes(id)),
			).toBe(true);
		});
	},
);

describe("trainingStepSlug", () => {
	it("utilise l'id de l'étape comme slug anglais", () => {
		expect(trainingStepSlug("en", "a1", "theory-timer")).toBe("theory-timer");
	});

	it("traduit en français", () => {
		expect(trainingStepSlug("fr", "a1", "theory-timer")).toBe(
			"theorie-temporisation",
		);
	});

	it("distingue un même id dans deux modules", () => {
		expect(trainingStepSlug("fr", "a1", "synthesis-parking")).toBe(
			"synthese-parking",
		);
		expect(trainingStepSlug("fr", "a5", "synthesis-parking")).toBe(
			"synthese-parking",
		);
		expect(trainingStepSlug("fr", "a2", "conclusion")).toBe("conclusion");
	});

	it("retombe sur l'id pour une étape inconnue", () => {
		expect(trainingStepSlug("fr", "a1", "s2")).toBe("s2");
	});
});

describe("trainingStepIdFromSlug", () => {
	const a1 = TRAINING_MODULE_STEP_IDS[1].stepIds;

	it("renvoie null pour un slug inconnu de la langue", () => {
		expect(trainingStepIdFromSlug("fr", "a1", "theory-timer", a1)).toBeNull();
		expect(
			trainingStepIdFromSlug("en", "a1", "theorie-temporisation", a1),
		).toBeNull();
		expect(trainingStepIdFromSlug("fr", "a1", "nimporte-quoi", a1)).toBeNull();
	});
});
