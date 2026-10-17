import { getMessages } from "@/i18n/messages";
import { createTranslator } from "next-intl";
import { buildModuleSteps } from "./training-modules";
import createTrainingModulePages from "./training-pages";

jest.mock("next-intl/server", () => ({
	getTranslations: ({
		locale,
		namespace,
	}: {
		locale: "fr" | "en";
		namespace: string;
	}) =>
		Promise.resolve(
			createTranslator({
				locale,
				messages: getMessages(locale),
				namespace: namespace as "training",
			}),
		),
	setRequestLocale: jest.fn(),
}));

jest.mock("next/navigation", () => ({
	notFound: () => {
		throw new Error("NEXT_NOT_FOUND");
	},
}));

jest.mock("./TrainingModulePage", () => ({
	__esModule: true,
	default: (props: unknown) => props,
}));

const a1 = createTrainingModulePages("a1");

describe("training module pages", () => {
	describe("generateStepStaticParams", () => {
		it("pré-génère toutes les étapes sauf la première, dans chaque langue", () => {
			const stepIds = buildModuleSteps("a1", "fr").map((s) => s.id);
			const params = a1.generateStepStaticParams();

			expect(params).toHaveLength((stepIds.length - 1) * 2);
			expect(params).toContainEqual({ locale: "en", step: stepIds[1] });
			expect(params).not.toContainEqual({ locale: "fr", step: stepIds[0] });
		});
	});

	describe("generateStepMetadata", () => {
		it("indexe une étape de théorie avec son titre et sa description propres", async () => {
			const metadata = await a1.generateStepMetadata({
				params: Promise.resolve({ locale: "fr", step: "theory-timer" }),
			});

			expect(metadata.title).toEqual({
				absolute: "Temporiser une réceptivité GRAFCET : formation",
			});
			expect(metadata.description).toContain("IEC 60848");
			expect(metadata.robots).toBeUndefined();
			expect(metadata.alternates?.canonical).toBe(
				"https://studomate.com/formations/a1/theory-timer",
			);
			expect(metadata.alternates?.languages).toEqual({
				fr: "https://studomate.com/formations/a1/theory-timer",
				en: "https://studomate.com/en/training/a1/theory-timer",
				"x-default": "https://studomate.com/formations/a1/theory-timer",
			});
		});

		it.each(["exercise-linear", "synthesis-parking"])(
			"met en noindex l'étape %s, avec un titre dérivé et la description du module",
			async (step) => {
				const metadata = await a1.generateStepMetadata({
					params: Promise.resolve({ locale: "en", step }),
				});

				expect(metadata.robots).toEqual({ index: false, follow: true });
				expect((metadata.title as { absolute: string }).absolute).toMatch(
					/\(module A1, Studomate Training\)$/,
				);
				expect(metadata.description).toBe(
					(
						getMessages("en") as {
							public: { metadata: { trainingA1Description: string } };
						}
					).public.metadata.trainingA1Description,
				);
			},
		);

		it("ne produit rien pour une étape inconnue", async () => {
			expect(
				await a1.generateStepMetadata({
					params: Promise.resolve({ locale: "fr", step: "nope" }),
				}),
			).toEqual({});
		});
	});

	describe("pages", () => {
		it("la page du module n'impose aucune étape (reprise de progression)", async () => {
			const page = (await a1.ModulePage({
				params: Promise.resolve({ locale: "fr" }),
			})) as { props: { initialStepId?: string; moduleId: string } };

			expect(page.props.moduleId).toBe("a1");
			expect(page.props.initialStepId).toBeUndefined();
		});

		it("la page d'étape transmet l'étape de l'URL, et toutes les étapes du module", async () => {
			const page = (await a1.StepPage({
				params: Promise.resolve({ locale: "fr", step: "theory-timer" }),
			})) as { props: { initialStepId: string; steps: unknown[] } };

			expect(page.props.initialStepId).toBe("theory-timer");
			expect(page.props.steps).toHaveLength(buildModuleSteps("a1", "fr").length);
		});

		it("répond 404 pour une étape inconnue", async () => {
			await expect(
				a1.StepPage({ params: Promise.resolve({ locale: "fr", step: "nope" }) }),
			).rejects.toThrow("NEXT_NOT_FOUND");
		});
	});
});
