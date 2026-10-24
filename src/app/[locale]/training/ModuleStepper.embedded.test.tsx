/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { useEffect } from "react";
import ModuleStepper, { StepData } from "./ModuleStepper";

const mockUnmounted = jest.fn();

jest.mock("@/persistence/repositories/training-progress.repository", () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		getStepId: jest.fn().mockResolvedValue(null),
		saveStepId: jest.fn(),
	})),
}));

jest.mock("next/dynamic", () => ({
	__esModule: true,
	default: (loader: () => Promise<{ default: React.ComponentType<any> }>) => {
		const { lazy, Suspense } = jest.requireActual("react");
		const Lazy = lazy(loader);
		return (props: any) => (
			<Suspense fallback={null}>
				<Lazy {...props} />
			</Suspense>
		);
	},
}));

jest.mock("./TrainingEmbeddedBlock", () => ({
	__esModule: true,
	default: function ObservationBlock({
		templateId,
		scene3d,
		watchOpen,
		initialView,
	}: {
		templateId: string;
		scene3d?: boolean;
		watchOpen?: boolean;
		initialView?: { type: string };
	}) {
		useEffect(() => () => mockUnmounted("observation"), []);
		return (
			<div
				data-testid="observation"
				data-scene3d={String(Boolean(scene3d))}
				data-watch-open={String(Boolean(watchOpen))}
				data-initial-view={initialView?.type ?? ""}
			>
				{templateId}
			</div>
		);
	},
}));

jest.mock("./TrainingExerciseBlock", () => ({
	__esModule: true,
	default: function ExerciseBlock({
		templateId,
		watchOpen,
	}: {
		templateId: string;
		watchOpen?: boolean;
	}) {
		useEffect(() => () => mockUnmounted("exercise"), []);
		return (
			<div data-testid="exercise" data-watch-open={String(Boolean(watchOpen))}>
				{templateId}
			</div>
		);
	},
}));

const steps: StepData[] = [
	{
		id: "observe",
		kind: "exercise",
		title: "Observer",
		body: ["Corps"],
		embeddedTemplateId: "parking",
		embeddedScene3d: true,
		embeddedWatchOpen: true,
		embeddedInitialView: { type: "ladder" },
		cta: { templateId: "parking", exerciseLabel: "Observer la simulation" },
	},
	{
		id: "exercise",
		kind: "exercise",
		title: "Exercice",
		body: ["Corps"],
		embeddedTemplateId: "linear-sequence",
		embeddedExercise: { exerciseTab: "Exercice", solutionTab: "Corrigé" },
		embeddedWatchOpen: true,
		cta: { templateId: "linear-sequence", exerciseLabel: "Ouvrir l'exercice" },
	},
	{ id: "theory", kind: "theory", title: "Théorie", body: ["Corps"] },
];

function setup() {
	window.history.replaceState(null, "", "/");
	return renderWithI18n(
		<ModuleStepper
			steps={steps}
			prevLabel="Précédent"
			nextLabel="Suivant"
			moduleId="a1"
			initialStepId="exercise"
		/>,
	);
}

describe("ModuleStepper embedded blocks", () => {
	beforeEach(() => mockUnmounted.mockClear());

	it("opens the exercise block from its button", async () => {
		setup();
		expect(screen.queryByTestId("exercise")).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Ouvrir l'exercice" }));

		expect(await screen.findByTestId("exercise")).toHaveTextContent(
			"linear-sequence",
		);
		expect(
			screen.queryByRole("button", { name: "Ouvrir l'exercice" }),
		).not.toBeInTheDocument();
	});

	it("keeps the exercise mounted, hidden, while another step is displayed", async () => {
		setup();
		fireEvent.click(screen.getByRole("button", { name: "Ouvrir l'exercice" }));
		const exercise = await screen.findByTestId("exercise");

		fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

		expect(screen.getByTestId("exercise")).toBe(exercise);
		expect(exercise.parentElement).not.toBeVisible();
		expect(mockUnmounted).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "Précédent" }));

		expect(screen.getByTestId("exercise")).toBe(exercise);
		expect(exercise.parentElement).toBeVisible();
	});

	it("tells the observation block to offer the 3D scene when the step asks for it", async () => {
		window.history.replaceState(null, "", "/");
		renderWithI18n(
			<ModuleStepper
				steps={steps}
				prevLabel="Précédent"
				nextLabel="Suivant"
				moduleId="a1"
				initialStepId="observe"
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Observer la simulation" }),
		);

		expect(await screen.findByTestId("observation")).toHaveAttribute(
			"data-scene3d",
			"true",
		);
	});

	it("tells the observation block which view to display first", async () => {
		window.history.replaceState(null, "", "/");
		renderWithI18n(
			<ModuleStepper
				steps={steps}
				prevLabel="Précédent"
				nextLabel="Suivant"
				moduleId="a1"
				initialStepId="observe"
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Observer la simulation" }),
		);

		expect(await screen.findByTestId("observation")).toHaveAttribute(
			"data-initial-view",
			"ladder",
		);
	});

	it("tells the blocks to open their watch table when the step asks for it", async () => {
		setup();
		fireEvent.click(screen.getByRole("button", { name: "Ouvrir l'exercice" }));
		expect(await screen.findByTestId("exercise")).toHaveAttribute(
			"data-watch-open",
			"true",
		);
	});

	it("tells the observation block to open its watch table when the step asks for it", async () => {
		window.history.replaceState(null, "", "/");
		renderWithI18n(
			<ModuleStepper
				steps={steps}
				prevLabel="Précédent"
				nextLabel="Suivant"
				moduleId="a1"
				initialStepId="observe"
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Observer la simulation" }),
		);

		expect(await screen.findByTestId("observation")).toHaveAttribute(
			"data-watch-open",
			"true",
		);
	});

	it("drops an observation block when leaving its step", async () => {
		window.history.replaceState(null, "", "/");
		renderWithI18n(
			<ModuleStepper
				steps={steps}
				prevLabel="Précédent"
				nextLabel="Suivant"
				moduleId="a1"
				initialStepId="observe"
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Observer la simulation" }),
		);
		expect(await screen.findByTestId("observation")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
		fireEvent.click(screen.getByRole("button", { name: "Précédent" }));

		expect(screen.queryByTestId("observation")).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Observer la simulation" }),
		).toBeInTheDocument();
		expect(mockUnmounted).toHaveBeenCalledWith("observation");
	});
});
