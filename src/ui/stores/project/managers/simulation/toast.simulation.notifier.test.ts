import ToastSimulationNotifier from "./toast.simulation.notifier";

const toastCalls: { level: string; message: string }[] = [];
jest.mock("react-toastify", () => ({
	toast: {
		success: (m: string) => toastCalls.push({ level: "success", message: m }),
		warn: (m: string) => toastCalls.push({ level: "warn", message: m }),
		error: (m: string) => toastCalls.push({ level: "error", message: m }),
	},
}));

describe("ToastSimulationNotifier", () => {
	let notifier: ToastSimulationNotifier;

	beforeEach(() => {
		toastCalls.length = 0;
		notifier = new ToastSimulationNotifier();
	});

	describe("niveau du message selon le résultat", () => {
		it("erreur quand il y a des erreurs", () => {
			notifier.analysisCompleted({ analysedElements: 5, errors: 2, warnings: 0 });
			expect(toastCalls[0].level).toBe("error");
		});

		it("avertissement quand il n'y a que des avertissements", () => {
			notifier.analysisCompleted({ analysedElements: 5, errors: 0, warnings: 3 });
			expect(toastCalls[0].level).toBe("warn");
		});

		it("succès quand tout va bien", () => {
			notifier.analysisCompleted({ analysedElements: 5, errors: 0, warnings: 0 });
			expect(toastCalls[0].level).toBe("success");
		});
	});

	// L'ancienne formulation produisait « 1 erreurs »
	describe("accord en nombre", () => {
		it("reste au singulier pour une seule occurrence", () => {
			notifier.analysisCompleted({ analysedElements: 1, errors: 1, warnings: 1 });

			expect(toastCalls[0].message).toContain("1 élément analysé");
			expect(toastCalls[0].message).toContain("1 erreur ");
			expect(toastCalls[0].message).toContain("1 avertissement ");
		});

		it("passe au pluriel au-delà", () => {
			notifier.analysisCompleted({ analysedElements: 4, errors: 2, warnings: 3 });

			expect(toastCalls[0].message).toContain("4 éléments analysés");
			expect(toastCalls[0].message).toContain("2 erreurs");
			expect(toastCalls[0].message).toContain("3 avertissements");
		});

		it("dit « aucune » plutôt que zéro", () => {
			notifier.analysisCompleted({ analysedElements: 3, errors: 0, warnings: 0 });

			expect(toastCalls[0].message).toContain("aucune erreur");
			expect(toastCalls[0].message).toContain("aucun avertissement");
		});
	});

	describe("échec de démarrage", () => {
		it("nomme l'étape en cause", () => {
			notifier.simulationCouldNotStart({ step: "pre-compilation", errorsCount: 1 });
			expect(toastCalls[0].message).toContain("pré-compilation");

			notifier.simulationCouldNotStart({ step: "compilation", errorsCount: 1 });
			expect(toastCalls[1].message).toContain("de la compilation");
		});

		it("accorde le nombre d'erreurs", () => {
			notifier.simulationCouldNotStart({ step: "compilation", errorsCount: 1 });
			expect(toastCalls[0].message).toContain("1 erreur ");

			notifier.simulationCouldNotStart({ step: "compilation", errorsCount: 3 });
			expect(toastCalls[1].message).toContain("3 erreurs");
		});
	});
});
