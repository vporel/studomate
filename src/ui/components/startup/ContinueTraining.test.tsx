/**
 * @jest-environment jsdom
 */
import { setPreferredLocale } from "@/persistence/preferences.storage";
import TRAINING_MODULE_STEP_IDS from "@/training/module-step-ids";
import { LocaleProvider } from "@/ui/i18n/LocaleProvider";
import { render, screen } from "@testing-library/react";
import ContinueTraining from "./ContinueTraining";
import type { TrainingResume } from "./training-resume";

function renderCard(resume: TrainingResume) {
	render(
		<LocaleProvider>
			<ContinueTraining resume={resume} />
		</LocaleProvider>,
	);
}

describe("ContinueTraining", () => {
	beforeEach(() => {
		localStorage.clear();
		setPreferredLocale("fr");
	});

	it("affiche le module, la progression et un lien de reprise vers l'étape sauvegardée", () => {
		const stepIds = TRAINING_MODULE_STEP_IDS[1].stepIds;
		const position = { moduleId: "a1" as const, stepCount: stepIds.length };
		renderCard({
			...position,
			stepId: stepIds[2],
			stepIndex: 2,
			nextModule: false,
			completed: { ...position, stepId: stepIds[1], stepIndex: 1 },
		});

		expect(screen.getByText(/^Module A1/)).toBeInTheDocument();
		expect(
			screen.getByText(new RegExp(`^Étape 3/${stepIds.length} : \\S`)),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				new RegExp(`^Terminé : Module A1.*étape 2/${stepIds.length} \\(\\S`),
			),
		).toBeInTheDocument();
		const link = screen.getByRole("link", { name: "Reprendre" });
		expect(link).toHaveAttribute("href", expect.stringContaining(stepIds[2]));
		expect(link).toHaveAttribute("target", "_blank");
	});

	it("propose de commencer le module suivant quand le précédent est terminé", () => {
		renderCard({
			moduleId: "a2",
			stepId: "first",
			stepIndex: 0,
			stepCount: 5,
			nextModule: true,
			completed: {
				moduleId: "a1",
				stepId: "synthesis-parking",
				stepIndex: 9,
				stepCount: 10,
			},
		});

		expect(screen.getByText(/^Module A2/)).toBeInTheDocument();
		expect(
			screen.getByText(/^Terminé : Module A1.*étape 10\/10/),
		).toBeInTheDocument();
		expect(
			screen.getByText("Module terminé, voici le suivant"),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Commencer" })).toHaveAttribute(
			"href",
			"/formations/a2",
		);
	});
});
