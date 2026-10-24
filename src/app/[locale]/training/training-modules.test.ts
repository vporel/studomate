import { getMessages } from "@/i18n/messages";
import {
	buildModuleSteps,
	moduleEntryPathname,
	moduleStepPathname,
	TRAINING_MODULES,
} from "./training-modules";
import { TRAINING_MODULE_IDS } from "@/training/module-ids";

type StepMetadataMessages = Record<
	string,
	Record<string, { title: string; description: string }>
>;

describe("training modules", () => {
	it.each(TRAINING_MODULE_IDS)(
		"%s : identifiants d'étapes uniques, première étape de théorie",
		(moduleId) => {
			const steps = buildModuleSteps(moduleId, "fr");
			const ids = steps.map((s) => s.id);
			expect(new Set(ids).size).toBe(ids.length);
			expect(steps[0].kind).toBe("theory");
		},
	);

	it.each(TRAINING_MODULE_IDS)(
		"%s : mêmes étapes (ids et types) dans les deux langues",
		(moduleId) => {
			const summary = (locale: "fr" | "en") =>
				buildModuleSteps(moduleId, locale).map((s) => [s.id, s.kind]);
			expect(summary("en")).toEqual(summary("fr"));
		},
	);

	it.each(["fr", "en"] as const)(
		"%s : titre et description pour chaque étape de théorie indexable (hors première) et rien d'autre",
		(locale) => {
			const messages = (
				getMessages(locale) as {
					public: { metadata: { trainingSteps: StepMetadataMessages } };
				}
			).public.metadata.trainingSteps;

			for (const moduleId of TRAINING_MODULE_IDS) {
				const expected = buildModuleSteps(moduleId, locale)
					.slice(1)
					.filter((s) => s.kind === "theory")
					.map((s) => s.id)
					.sort();
				expect(Object.keys(messages[moduleId] ?? {}).sort()).toEqual(expected);
				for (const { title, description } of Object.values(
					messages[moduleId],
				)) {
					expect(title).toBeTruthy();
					expect(description).toBeTruthy();
				}
			}
		},
	);

	it("chaque module pointe vers le suivant du parcours, le dernier n'en a pas", () => {
		expect(TRAINING_MODULES.a0.next?.href).toBe("/training/a1");
		expect(TRAINING_MODULES.a3.next?.href).toBe("/training/a4");
		expect(TRAINING_MODULES.a4.next).toBeUndefined();
	});

	it("dérive les chemins internes du module", () => {
		expect(moduleEntryPathname("a2")).toBe("/training/a2");
		expect(moduleStepPathname("a2")).toBe("/training/a2/[step]");
	});
});
