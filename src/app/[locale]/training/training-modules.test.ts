import { getMessages } from "@/i18n/messages";
import {
	buildModuleSteps,
	moduleEntryPathname,
	moduleStepPathname,
	TRAINING_MODULES,
} from "./training-modules";
import { PROJECT_TEMPLATES } from "@/templates";
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
		expect(TRAINING_MODULES.a4.next?.href).toBe("/training/a5");
		expect(TRAINING_MODULES.a5.next).toBeUndefined();
	});

	it("A4 couvre une séquence de l'étape aux sorties, A5 les structures avancées", () => {
		const ids = (moduleId: "a4" | "a5") =>
			buildModuleSteps(moduleId, "fr").map((s) => s.id);
		expect(ids("a4")).toEqual([
			"theory-steps-ladder",
			"exercise-grafcet-naive",
			"theory-method-ladder",
			"theory-two-programs",
			"exercise-grafcet-linear",
			"theory-actions-ladder",
			"theory-edge-actions-ladder",
			"theory-receptivity-timer",
			"theory-movement-supervision",
			"synthesis-drilling",
			"conclusion",
		]);
		expect(ids("a5")).toEqual([
			"theory-or-divergence-ladder",
			"exercise-grafcet-or-divergence",
			"theory-and-divergence-ladder",
			"exercise-grafcet-and-divergence",
			"theory-grafcet-reset",
			"exercise-grafcet-reset",
			"synthesis-parking",
			"theory-going-further",
			"theory-three-blocks",
			"conclusion",
		]);
	});

	it("A4 et A5 ont un sous-titre dans les deux langues, les autres modules n'en ont pas", () => {
		for (const moduleId of TRAINING_MODULE_IDS) {
			const { subtitleKey } = TRAINING_MODULES[moduleId];
			if (moduleId !== "a4" && moduleId !== "a5") {
				expect(subtitleKey).toBeUndefined();
				continue;
			}
			for (const locale of ["fr", "en"] as const) {
				const training = (
					getMessages(locale) as unknown as {
						training: Record<string, unknown>;
					}
				).training;
				expect(training[subtitleKey!]).toBeTruthy();
			}
		}
	});

	it("les templates cités par les exercices et épreuves de A4 et A5 existent", () => {
		for (const moduleId of ["a4", "a5"] as const) {
			for (const step of buildModuleSteps(moduleId, "fr")) {
				if (!step.cta) continue;
				expect(PROJECT_TEMPLATES.map((t) => t.id)).toContain(
					step.cta.templateId,
				);
			}
		}
	});

	it("dérive les chemins internes du module", () => {
		expect(moduleEntryPathname("a2")).toBe("/training/a2");
		expect(moduleStepPathname("a2")).toBe("/training/a2/[step]");
	});
});
